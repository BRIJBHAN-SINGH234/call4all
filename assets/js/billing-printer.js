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

  function attach({ connectButton, printButton, status, getReceipt }) {
    let device;
    let output;
    let busy = false;

    function refresh(message) {
      const connected = Boolean(output && device?.gatt.connected);
      connectButton.disabled = busy;
      connectButton.textContent = connected ? 'Disconnect printer' : 'Connect printer';
      printButton.textContent = connected ? 'Print to printer' : 'Print Bill';
      status.textContent = message;
    }

    if (!navigator.bluetooth) {
      connectButton.disabled = true;
      status.textContent = 'Bluetooth ke liye supported browser (jaise Android Chrome) mein HTTPS par billing kholein. System print ke liye Print dabayein.';
    } else {
      refresh('Bluetooth printer connected nahi hai.');
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
            ? 'Printer select nahi hua.'
            : 'Printer connect nahi hua. ' + error.message;
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
      if (!output || !device?.gatt.connected) {
        window.print();
        return;
      }

      const target = output;
      const withResponse = target.properties.write;
      const text = receipt.replaceAll('₹', 'Rs ').replaceAll('×', 'x')
        .replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, '?');
      const bytes = new TextEncoder().encode('\x1b@' + text.trimEnd() + '\n\n\n');
      busy = true;
      refresh('Bill printer ko bhej rahe hain…');
      let message;
      try {
        // 20 bytes also works with the default BLE ATT MTU.
        for (let offset = 0; offset < bytes.length; offset += 20) {
          const chunk = bytes.subarray(offset, offset + 20);
          if (withResponse) {
            await target.writeValueWithResponse(chunk);
          } else {
            await target.writeValueWithoutResponse(chunk);
            await new Promise(resolve => setTimeout(resolve, 25));
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
