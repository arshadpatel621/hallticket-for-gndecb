# Zen Hall Ticket Generator

A lightweight hall ticket generator for Guru Nanak Dev Engineering College, Bidar. Upload student data in Excel format and generate PDF hall tickets packaged as a ZIP file.

## Features

- Upload an Excel student list with seat numbers, names, and subjects
- Generate A4 PDF hall tickets with college header, student details, subjects, and signature fields
- Download results as `halltickets.zip`
- Supports manual subject entry for all students
- Built for Vercel with a serverless API and also includes a local Express server option

## Project Structure

- `public/` - frontend assets (`index.html`, `style.css`, `script.js`)
- `api/generate.js` - Vercel serverless handler for PDF generation
- `server.js` - local Express backend for generating tickets from uploaded Excel
- `uploads/` - temporary storage for uploaded files in local server mode
- `package.json` - project dependencies and scripts

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the app locally:

```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser.

> Note: The frontend uses the API route `/api/generate`. Local development is also supported because `server.js` accepts both `/generate` and `/api/generate`.

## Usage

1. Open the app in your browser.
2. Upload an Excel file containing student data.
3. Optionally set the department name, exam name, and semester.
4. Choose whether to use subjects from the Excel file or enter manual subjects.
5. Click **Generate Hall Tickets** and download the resulting ZIP file.

## Excel Format

The Excel sheet must include at least these columns:

- `Seat No` or `USN` (student seat number)
- `Name` (student name)
- `Subjects Applied` (comma-separated subject codes)

Example subject value:

```text
21CS81, 21CS82, 21CS83
```

## Deployment

This project is configured for Vercel.

### Vercel

- A `vercel.json` file routes frontend requests to `public/` and API requests to `api/generate.js`
- The frontend uses `/api/generate` for ticket generation
- Deploy by connecting the repository to Vercel or using the Vercel CLI:

```bash
npm install -g vercel
vercel
```

## Scripts

- `npm start` - run `node server.js`
- `npm run dev` - run `nodemon server.js`

## Notes

- `api/generate.js` uses a serverless handler for PDF generation.
- The local backend stores uploaded files in `uploads/` when using `server.js`.

## License

MIT
