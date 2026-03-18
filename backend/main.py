import os
import tempfile
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE")  
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
app = FastAPI(title="Real-Rag backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

persist_directory = "./chroma_db"
try:
    embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large",
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_API_BASE,
    )
    print(f"✅ OpenAIEmbeddings initialized successfully (base_url={OPENAI_API_BASE})")
except Exception as e:
    print(f"❌ Failed to initialize OpenAIEmbeddings: {e}")
    embeddings = None

class AskRequest(BaseModel):
    user_id: str
    question: str

@app.post("/api/upload")
async def upload_pdf(user_id: str = Form(...), file: UploadFile = File(...)):
    if not embeddings:
         raise HTTPException(status_code=500, detail="OpenAIEmbeddings not initialized. Check OPENAI_API_KEY")
         
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        loader = PyPDFLoader(tmp_path)
        docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # Store user-specific Chroma db in a separate folder inside persist_directory
        user_persist_dir = os.path.join(persist_directory, user_id)
        
        vectorstore = Chroma.from_documents(
            documents=splits, 
            embedding=embeddings, 
            persist_directory=user_persist_dir
        )
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

    return {"message": "PDF uploaded and processed successfully", "filename": file.filename}

@app.post("/api/ask")
async def ask_question(req: AskRequest):
    if not embeddings:
         raise HTTPException(status_code=500, detail="OpenAIEmbeddings not initialized. Check OPENAI_API_KEY")

    user_persist_dir = os.path.join(persist_directory, req.user_id)
    
    if os.path.exists(user_persist_dir):
        vectorstore = Chroma(persist_directory=user_persist_dir, embedding_function=embeddings)
    else:
        raise HTTPException(status_code=404, detail="No documents found for this user. Please upload a PDF first.")

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    # llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    llm = ChatOpenAI(
        model="gpt-4o", # Model zoo
        temperature=0,
        base_url= OPENAI_API_BASE,
    )
    
    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer the question. "
        "If you don't know the answer, say that you don't know. "
        "Use three sentences maximum and keep the answer concise."
        "\n\n"
        "{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    
    response = rag_chain.invoke({"input": req.question})
    return {"answer": response["answer"]}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Real-Rag API. Endpoint is up and running."}
