// index.js
const mammoth = require('mammoth');
const Busboy = require('busboy'); // A feltöltött fájlok kezeléséhez

exports.extractDocxText = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*'); // Fontos CORS beállítás

    if (req.method === 'OPTIONS') {
        // Kezeli a preflight kéréseket (CORS)
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed. Only POST requests are accepted.');
    }

    const busboy = Busboy({ headers: req.headers });
    let fileBuffer = Buffer.alloc(0);
    let fileName = '';

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'docxFile' || mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return res.status(400).send('Invalid file field name or MIME type. Please upload a .docx file named "docxFile".');
        }
        fileName = filename;
        file.on('data', (data) => {
            fileBuffer = Buffer.concat([fileBuffer, data]);
        });
        file.on('end', () => {
            console.log(`File [${fileName}] finished`);
        });
    });

    busboy.on('finish', async () => {
        if (!fileBuffer.length) {
            return res.status(400).send('No file uploaded.');
        }

        try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            const text = result.value; // A kinyert sima szöveg
            // const messages = result.messages; // Hibaüzenetek, ha vannak

            // Visszaküldi a kinyert szöveget JSON formátumban
            res.status(200).json({
                extractedText: text,
                fileName: fileName
            });
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            res.status(500).send('Error processing DOCX file.');
        }
    });

    // Ez a rész a platformtól függően változhat, de alapvetően a request streamet kell pipe-olni a busboy-nak
    // A legtöbb serverless környezetben a `req.pipe(busboy)` vagy hasonló módon fog működni.
    req.pipe(busboy);
};