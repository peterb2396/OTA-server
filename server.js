const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const app = express();

const port = 3000;
const dotenv = require('dotenv'); 
app.use(bodyParser.urlencoded({ extended: true }));

dotenv.config();

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASS,
    },
  });

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: './uploads',
    filename: function (req, file, cb) {
      const fileName = 'temp.bin'; // Set a fixed file name (to overwrite binaries)
      cb(null, fileName);
    }
  });

const upload = multer({ storage });

// Serve HTML form for file upload
app.get('/upload', (req, res) => {
    const password = req.query.password;
    if (password == process.env.URL_PASS) {
        
        // Password is correct
        // Serve the HTML form for file upload
        res.sendFile(path.join(__dirname, 'upload.html'))

        // Generate 2fa code and send to me
        const code = generateRandomPassword(50)
        fs.writeFileSync('2fa.txt', code)

        // Email
        const mailOptions = {
            from: process.env.MAILER_USER,
            to: process.env.MAILER_DEST,
            subject: 'Binary Upload',
            text: `Code: ${code}`,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
            console.log('Error sending email:', error);
            res.status(500).json({ message: 'Failed to send the email' });
            } else {
            res.status(200).json({ message: 'Email sent successfully' });
            }
        });
      } else {
        
        res.status(401).send('404 Not found');
      }
    
  });

// Server welcome page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

// Read the current version
app.get('/version', (req,res) => {
  const version_str = fs.readFileSync('version.txt', 'utf-8');
  res.send(version_str)
  
})

// Handle file upload with password
app.post('/upload', upload.single('file'), (req, res) => {
    const { password, otp } = req.body;
    const OTP_stored = fs.readFileSync('2fa.txt', 'utf-8');
    
    fs.unlink('2fa.txt', (err)=> {});
    
      // Password is correct, check 2fa
      if (password == process.env.UPLOAD_PASS && OTP_stored == otp)
      {

        // Accept the temp file
        fs.rename('uploads/temp.bin', 'uploads/binary.bin', (err)=> {})

        // Increase the version
        const version_str = fs.readFileSync('version.txt', 'utf-8');
        let version = +version_str
        fs.writeFileSync('version.txt', ++version + '') // Increase the version and write it to file

        // Send success message
        res.send('Successfully uploaded version '+ version);
        
      }

      else {
      // credentials incorrect, reject the file
      fs.unlink('uploads/temp.bin', (err)=> {});
      res.status(401).send('Unauthorized');
    }
  });

// Serve files
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


function generateRandomPassword(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
  
    return password;
  }