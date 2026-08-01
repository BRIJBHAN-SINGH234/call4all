# Bikri Patra (Sale Deed) Tool

Shubham ke sale-deed template ka reusable data-entry system. Har baar sirf changing
fields (seller, buyer, plot, price, witnesses, date etc.) bharo — baaki poora legal
content jaisa tha waisa hi rehta hai.

## Files

- **form.html** — Browser me kholne wala data-entry form. Sab changing fields yahan
  bharkar "Data taiyar karein" dabao, phir JSON copy karke Claude ki chat me paste karo.
- **template.docx** — Original document jisme sab changing values `{{TOKEN}}` se replace
  ho chuki hain (e.g. `{{SELLER_NAME}}`, `{{PLOT_NUMBER}}`). Ye master template hai.
- **generate.py** — Is template.docx ko values.json ke saath process karke final filled
  docx banata hai.

## generate.py kaise chalayen

```bash
# template.docx isi folder me hona chahiye
python3 generate.py values.json output_name
# -> output_name.docx ban jayega
```

`values.json` me sab tokens ki values honi chahiye, jaise:

```json
{
  "SELLER_NAME": "राजेन्द्र कुमार शर्मा",
  "DEED_DATE": "30/07/2026",
  "PLOT_NUMBER": "141",
  ...
}
```

Har token ka poora naam form.html ke andar hi likha hai (label ke saamne bracket me).

## Workflow (Claude ke saath)

1. `form.html` browser me kholo, fields bharo, format (docx/pdf) chuno.
2. "Data taiyar karein" dabao -> JSON text box khulega -> copy karo.
3. Wo JSON Claude ki chat me paste karo.
4. Claude `generate.py` chalakar asli docx banayega, PDF preview dikhayega.
5. Confirm karne ke baad final docx/pdf download link milega.
