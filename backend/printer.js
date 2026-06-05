const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { print, getPrinters, getDefaultPrinter } = require('pdf-to-printer');

/**
 * Creates a PDF from an image and prints it.
 * @param {string} imagePath - Path to the saved image file.
 * @param {string} colorMode - 'color' or 'bw'
 * @param {string} printerId - The selected printer id, or 'default'
 * @returns {Promise<void>}
 */
async function printImage(imagePath, colorMode, printerId) {
    const pdfPath = path.join(__dirname, `temp_print_${Date.now()}.pdf`);
    const isMonochrome = colorMode === 'bw';
    
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ autoFirstPage: false });
            const writeStream = fs.createWriteStream(pdfPath);
            
            doc.pipe(writeStream);
            
            // Open the image to get its dimensions
            const img = doc.openImage(imagePath);
            doc.addPage({
                size: [img.width, img.height],
                margin: 0
            });
            doc.image(img, 0, 0);
            doc.end();

            writeStream.on('finish', async () => {
                try {
                    // Send PDF to the printer with options
                    const options = { monochrome: isMonochrome };
                    if (printerId && printerId !== 'default') {
                        options.printer = printerId;
                    }
                    await print(pdfPath, options);
                    console.log(`Successfully printed ${pdfPath} in ${isMonochrome ? 'B/W' : 'Color'} to ${printerId}`);
                    
                    // Cleanup
                    fs.unlinkSync(imagePath);
                    fs.unlinkSync(pdfPath);
                    resolve();
                } catch (printErr) {
                    console.error("Print error:", printErr);
                    // Still try to clean up
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                    reject(printErr);
                }
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Prints an existing PDF file.
 * @param {string} pdfPath - Path to the PDF file.
 * @param {string} colorMode - 'color' or 'bw'
 * @param {string} printerId - The selected printer id, or 'default'
 * @returns {Promise<void>}
 */
async function printRawPdf(pdfPath, colorMode, printerId) {
    const isMonochrome = colorMode === 'bw';
    try {
        const options = { monochrome: isMonochrome };
        if (printerId && printerId !== 'default') {
            options.printer = printerId;
        }
        await print(pdfPath, options);
        console.log(`Successfully printed raw PDF ${pdfPath} in ${isMonochrome ? 'B/W' : 'Color'} to ${printerId}`);
        fs.unlinkSync(pdfPath);
    } catch (err) {
        console.error("Print error:", err);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        throw err;
    }
}

async function getAvailablePrinters() {
    try {
        const printers = await getPrinters();
        return printers;
    } catch (err) {
        console.error("Failed to get printers:", err);
        return [];
    }
}

module.exports = { printImage, printRawPdf, getAvailablePrinters };
