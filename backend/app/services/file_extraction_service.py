# backend/app/services/file_extraction_service.py
import io
from typing import List
from fastapi import UploadFile
import fitz  # PyMuPDF for PDF parsing

# Keep unstructured for DOCX and PPTX
from unstructured.partition.docx import partition_docx
from unstructured.partition.pptx import partition_pptx
from unstructured.documents.elements import Text, Table


class FileExtractionService:
    """Service for extracting text content from various file formats"""
    
    def __init__(self):
        self.supported_extensions = {'.pdf', '.docx', '.pptx'}
    
    async def extract_text_from_files(self, files: List[UploadFile]) -> List[str]:
        """Extract text from PDF (PyMuPDF), DOCX (unstructured), and PPTX (unstructured)."""
        extracted_content = []

        for file in files:
            try:
                file_ext = '.' + file.filename.split('.')[-1].lower()
                if file_ext not in self.supported_extensions:
                    extracted_content.append(
                        f"Unsupported file type for {file.filename}. Only PDF, DOCX, and PPTX are supported."
                    )
                    continue

                file_content = await file.read()
                file_like_object = io.BytesIO(file_content)

                if file_ext == '.pdf':
                    # Use lightweight PyMuPDF
                    pdf_doc = fitz.open(stream=file_like_object.read(), filetype="pdf")
                    pdf_text = "\n".join([page.get_text() for page in pdf_doc])
                    extracted_content.append(pdf_text)

                elif file_ext == '.docx':
                    elements = partition_docx(file=file_like_object)
                    for element in elements:
                        if isinstance(element, (Text, Table)):
                            extracted_content.append(element.text)

                elif file_ext == '.pptx':
                    elements = partition_pptx(file=file_like_object)
                    for element in elements:
                        if isinstance(element, (Text, Table)):
                            extracted_content.append(element.text)

            except Exception as e:
                extracted_content.append(f"Error processing file {file.filename}: {str(e)}")

        return extracted_content
    
    async def extract_text_from_single_file(self, file: UploadFile) -> str:
        """Extract text from a single file"""
        files = [file]
        results = await self.extract_text_from_files(files)
        return results[0] if results else ""
    
    def get_supported_extensions(self) -> List[str]:
        """Get list of supported file extensions"""
        return list(self.supported_extensions)
