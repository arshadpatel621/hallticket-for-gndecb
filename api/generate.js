const Busboy = require('busboy');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const LOGO_BASE64 = null;

function drawTicket(doc, row, yStart, deptName, examName, logoData, semester) {
    const width = 595.28;
    const boxTop = yStart - 40;
    const boxBottom = yStart + 240;
    const boxHeight = boxBottom - boxTop;
    const boxLeft = 30;
    const boxRight = width - 30;

    doc.lineWidth(1);
    doc.rect(boxLeft, boxTop, boxRight - boxLeft, boxHeight).stroke();

    if (logoData) {
        try {
            const imageData = Buffer.isBuffer(logoData) ? logoData : Buffer.from(logoData, 'base64');
            doc.image(imageData, boxLeft + 10, yStart - 10, { width: 50, height: 50 });
        } catch (e) {
            console.error('Error loading logo:', e);
        }
    }

    doc.font('Helvetica-Bold').fontSize(13);
    doc.text('GURU NANAK DEV ENGINEERING COLLEGE, BIDAR', 0, yStart, { align: 'center', width });

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(deptName.toUpperCase(), 0, yStart + 20, { align: 'center', width });

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`ADMISSION TICKET FOR ${examName.toUpperCase()}`, 0, yStart + 40, { align: 'center', width });

    doc.lineWidth(0.5);
    doc.moveTo(40, yStart + 50).lineTo(width - 40, yStart + 50).stroke();
    doc.lineWidth(1);

    doc.font('Helvetica').fontSize(10);
    const semesterDisplay = semester ? `Semester: ${semester}` : 'Semester: Not specified';
    doc.text(`1. UNIVERSITY SEAT NO.: ${row['Seat No'] || ''}     ${semesterDisplay}`, 50, yStart + 80);
    doc.text(`2. NAME OF THE CANDIDATE: ${row['Name'] || ''}`, 50, yStart + 100);
    doc.text('3. SUBJECTS APPLIED:', 50, yStart + 120);

    let subjects = [];
    if (row['Subjects Applied']) {
        subjects = String(row['Subjects Applied']).split(',');
    }

    const startX = 70;
    const startY = yStart + 140;
    let currentX = startX;
    let currentY = startY;
    const maxWidth = width - 100;
    const boxWidth = 35;
    const subjectGap = 10;
    const marginBetweenSubjects = 15;

    subjects.forEach((sub) => {
        sub = sub.trim();
        const estimatedTextWidth = sub.length * 6;
        const totalSubjectWidth = estimatedTextWidth + subjectGap + boxWidth + marginBetweenSubjects;

        if (currentX + totalSubjectWidth > maxWidth) {
            currentY += 22;
            currentX = startX;
        }

        doc.text(sub, currentX, currentY);
        const boxX = currentX + estimatedTextWidth + subjectGap;
        doc.rect(boxX, currentY - 5, boxWidth, 15).stroke();
        currentX = boxX + boxWidth + marginBetweenSubjects;
    });

    const signatureY = yStart + 200;
    const hodX = boxLeft + 50;
    const hodText = 'Signature of HOD';
    const hodTextWidth = hodText.length * 6;
    const hodSignatureX = boxRight - hodTextWidth - 20;

    doc.text('Signature of Student', hodX, signatureY);
    doc.text(hodText, hodSignatureX, signatureY);
}

function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        const files = {};

        busboy.on('file', (fieldname, file) => {
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                files[fieldname] = Buffer.concat(chunks);
            });
        });

        busboy.on('field', (fieldname, value) => {
            fields[fieldname] = value;
        });

        busboy.on('finish', () => resolve({ fields, files }));
        busboy.on('error', reject);

        req.pipe(busboy);
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
    }

    try {
        const { fields, files } = await parseMultipartForm(req);

        if (!files.excelFile) {
            res.statusCode = 400;
            res.end('No Excel file uploaded.');
            return;
        }

        const excelBuffer = files.excelFile;
        const logoData = files.logoFile ? files.logoFile : LOGO_BASE64;
        const deptName = fields.deptName || 'INFORMATION SCIENCE ENGINEERING';
        const examName = fields.examName || 'B.E EXAMINATION JUNE / JULY 2025';
        const semester = fields.semester || '';
        const customSubjects = fields.customSubjects ? JSON.parse(fields.customSubjects) : null;
        const useManualSubjects = fields.useManualSubjects === 'true';

        const workbook = xlsx.read(excelBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks = [];

        archive.on('data', (chunk) => chunks.push(chunk));

        const archivePromise = new Promise((resolve, reject) => {
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);
        });

        let pageNum = 1;
        for (let i = 0; i < data.length; i += 3) {
            const batch = data.slice(i, i + 3);
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const filename = `halltickets_page_${pageNum}.pdf`;
            archive.append(doc, { name: filename });
            const yPositions = [50, 310, 570];

            batch.forEach((row, index) => {
                if (useManualSubjects && customSubjects && customSubjects.length > 0) {
                    row['Subjects Applied'] = customSubjects.join(', ');
                }
                drawTicket(doc, row, yPositions[index], deptName, examName, logoData, semester);
            });

            doc.end();
            pageNum++;
        }

        archive.finalize();
        const zipBuffer = await archivePromise;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="halltickets.zip"');
        res.statusCode = 200;
        res.end(zipBuffer);
    } catch (error) {
        console.error('Function error:', error);
        res.statusCode = 500;
        res.end('Error generating tickets: ' + error.message);
    }
};
