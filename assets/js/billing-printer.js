'use strict';

const BillingPrinter = (() => {
  // ESC/POS BLE service and write characteristic pairs.
  const profiles = [
    [0x18f0, 0x2af1],
    [0xff00, 0xff02],
    [0xffe0, 0xffe1]
  ];

  async function findOutput(server) {
    for (const [serviceId, outputId] of profiles) {
      try {
        const service = await server.getPrimaryService(serviceId);
        const output = await service.getCharacteristic(outputId);
        if (output.properties.write || output.properties.writeWithoutResponse) return output;
      } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
      }
    }
    throw Error('Is printer ka Bluetooth print profile supported nahi hai.');
  }

  function attach({ connectButton, serialButton, printButton, status, getReceipt }) {
    let device;
    let output;
    let serialPort;
    let busy = false;

    const onLinux = /Linux/.test(navigator.platform) && !/Android/.test(navigator.userAgent);
    const systemPrint = onLinux
      ? 'USB ya network printer ko Settings → Printers mein add karke Print Bill dabayein.'
      : 'System printer ke liye Print Bill dabayein.';
    const bluetooth = typeof navigator.bluetooth?.requestDevice === 'function';

    const serial = serialButton && typeof navigator.serial?.requestPort === 'function';
    if (serialButton) serialButton.hidden = !serial;

    function refresh(message) {
      const connected = Boolean(output && device?.gatt.connected);
      if (serial) {
        serialButton.disabled = busy || connected;
        serialButton.textContent = serialPort ? 'Disconnect Bluetooth Classic' : 'Connect Bluetooth Classic';
      }
      connectButton.disabled = busy || !bluetooth || Boolean(serialPort);
      connectButton.textContent = connected ? 'Disconnect BLE printer' : 'Connect BLE printer';
      printButton.textContent = connected || serialPort ? 'Print to printer' : 'Print Bill';
      status.textContent = message;
    }

    refresh(serial
      ? 'Paired thermal printer (jaise BKT02) ke liye Connect Bluetooth Classic dabayein.'
      : bluetooth ? systemPrint : 'Is browser mein direct Bluetooth print available nahi hai. ' + systemPrint);
    if (serial) {
      navigator.serial.addEventListener('disconnect', event => {
        if (event.target !== serialPort) return;
        serialPort = null;
        if (!busy) refresh('Printer disconnected.');
      });
      serialButton.onclick = async () => {
        if (busy) return;
        busy = true;
        refresh('Bluetooth Classic printer connect ho raha hai…');
        let message;
        try {
          if (serialPort) {
            const port = serialPort;
            await port.close();
            serialPort = null;
            message = 'Printer disconnected.';
          } else {
            const port = await navigator.serial.requestPort({
              filters: [{ bluetoothServiceClassId: 0x1101 }]
            });
            await port.open({ baudRate: 9600 });
            serialPort = port;
            message = 'Bluetooth Classic printer connected.';
          }
        } catch (error) {
          message = error.name === 'NotFoundError'
            ? 'Printer select nahi hua. Printer ko Ubuntu Bluetooth Settings mein pair karke on rakhein.'
            : 'Bluetooth Classic printer connect nahi hua. ' + error.message;
        } finally {
          busy = false;
          refresh(message);
        }
      };
    }
    if (bluetooth) {
      connectButton.onclick = async () => {
        if (busy) return;
        if (output && device?.gatt.connected) {
          output = null;
          device.gatt.disconnect();
          refresh('Printer disconnected.');
          return;
        }

        busy = true;
        refresh('Bluetooth printer select karein…');
        let message;
        try {
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: profiles.map(([serviceId]) => serviceId)
          });
          const printer = device;
          printer.addEventListener('gattserverdisconnected', () => {
            if (device !== printer || printer.gatt.connected) return;
            output = null;
            if (!busy) refresh('Printer disconnected.');
          }, { once: true });
          output = await findOutput(await printer.gatt.connect());
          if (!printer.gatt.connected) throw Error('Printer disconnected.');
          message = (printer.name || 'Bluetooth printer') + ' connected.';
        } catch (error) {
          output = null;
          device?.gatt?.disconnect();
          device = null;
          message = error.name === 'NotFoundError'
            ? 'Bluetooth printer select nahi hua. ' + systemPrint
            : 'Printer connect nahi hua. ' + error.message + ' ' + systemPrint;
        } finally {
          busy = false;
          refresh(message);
        }
      };
    }

    printButton.onclick = async () => {
      if (busy) return;
      const receipt = getReceipt();
      if (!receipt) return;
      if (!serialPort && (!output || !device?.gatt.connected)) {
        window.print();
        return;
      }

      const target = output;
      const text = receipt.replaceAll('₹', 'Rs ').replaceAll('×', 'x')
        .replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, '?');
      const bytes = new TextEncoder().encode('\x1b@' + text.trimEnd() + '\n\n\n');
      busy = true;
      refresh('Bill printer ko bhej rahe hain…');
      let message;
      try {
        if (serialPort) {
          const writer = serialPort.writable.getWriter();
          try {
            await writer.write(bytes);
          } finally {
            writer.releaseLock();
          }
        } else {
          // 20 bytes also works with the default BLE ATT MTU.
          for (let offset = 0; offset < bytes.length; offset += 20) {
            const chunk = bytes.subarray(offset, offset + 20);
            if (target.properties.write) {
              await target.writeValueWithResponse(chunk);
            } else {
              await target.writeValueWithoutResponse(chunk);
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }
        }
        message = 'Bill printer ko bhej diya.';
      } catch {
        message = 'Print beech mein ruk gaya. Dobara print karne se pehle paper check karein.';
      } finally {
        busy = false;
        refresh(message);
      }
    };
  }

  return { attach };
})();
