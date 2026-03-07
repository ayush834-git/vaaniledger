import PDFDocument from 'pdfkit';
import fs from 'fs';

async function testPdf() {
  try {
    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        doc.fontSize(24).font("Helvetica-Bold").text("VaaniLedger Test", { align: "center" });
        doc.text("Hello World!");
        doc.end();
      } catch (e) {
        reject(e);
      }
    });

    fs.writeFileSync("test.pdf", pdfBuffer);
    console.log("PDF generated successfully! Size:", pdfBuffer.length);
  } catch (err) {
    console.error("Failed to generate PDF:", err);
  }
}

testPdf();
