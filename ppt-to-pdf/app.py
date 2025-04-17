from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import comtypes.client
import pythoncom
from pathlib import Path
import win32com.client
import tempfile
import shutil

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload/ppt-to-pdf")
async def convert_ppt_to_pdf(file: UploadFile = File(...)):
    try:
        # Check file extension
        if not file.filename.lower().endswith(('.ppt', '.pptx')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only PPT and PPTX files are allowed.")

        # Create temporary directory for conversion
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            temp_ppt = Path(temp_dir) / file.filename
            with temp_ppt.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Convert to PDF
            pythoncom.CoInitialize()
            powerpoint = win32com.client.Dispatch("Powerpoint.Application")
            powerpoint.Visible = False

            ppt = powerpoint.Presentations.Open(str(temp_ppt.absolute()))
            pdf_path = Path(temp_dir) / f"{temp_ppt.stem}.pdf"
            
            # Save as PDF
            ppt.SaveAs(str(pdf_path.absolute()), 32)  # 32 is the PDF format code
            ppt.Close()
            powerpoint.Quit()

            # Move PDF to uploads directory
            final_pdf_path = UPLOAD_DIR / f"{temp_ppt.stem}.pdf"
            shutil.move(str(pdf_path), str(final_pdf_path))

            # Return the PDF file
            return FileResponse(
                path=final_pdf_path,
                filename=f"{temp_ppt.stem}.pdf",
                media_type="application/pdf",
                background=None
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up
        if 'powerpoint' in locals():
            try:
                powerpoint.Quit()
            except:
                pass
        pythoncom.CoUninitialize()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5008)
