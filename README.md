# RMCL Tools

A browser-based suite of scientific utilities. The catalog lives at `/`; the first tool, a Bradford assay standards-curve calculator, lives at `/bradford`.

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Validation

```bash
cd frontend
npm test
npm run build
```

The production Docker image builds the React application and serves it with Nginx on port 8080. Spreadsheet data is processed entirely in the browser and is not uploaded or persisted.

