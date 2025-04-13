import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';

class RAGManager {
    constructor() {
        this.vectorStore = null;
        this.embeddings = new OpenAIEmbeddings();
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
    }

    async initialize() {
        try {
            // Load existing vector store from storage if available
            const storedVectorStore = await chrome.storage.local.get('RAG_VECTOR_STORE');
            if (storedVectorStore.RAG_VECTOR_STORE) {
                this.vectorStore = await HNSWLib.load(
                    'vector_store',
                    this.embeddings,
                    storedVectorStore.RAG_VECTOR_STORE
                );
            } else {
                this.vectorStore = await HNSWLib.fromDocuments([], this.embeddings);
            }
        } catch (error) {
            console.error('Error initializing RAG:', error);
            this.vectorStore = await HNSWLib.fromDocuments([], this.embeddings);
        }
    }

    async addDocument(text, metadata = {}) {
        try {
            const docs = await this.textSplitter.createDocuments(
                [text],
                [metadata]
            );
            
            await this.vectorStore.addDocuments(docs);
            
            // Save the updated vector store
            const vectorStoreData = await this.vectorStore.save('vector_store');
            await chrome.storage.local.set({ 'RAG_VECTOR_STORE': vectorStoreData });
            
            return true;
        } catch (error) {
            console.error('Error adding document to RAG:', error);
            return false;
        }
    }

    async retrieveRelevantContext(query, k = 3) {
        try {
            if (!this.vectorStore) {
                await this.initialize();
            }
            
            const results = await this.vectorStore.similaritySearch(query, k);
            return results.map(doc => ({
                content: doc.pageContent,
                metadata: doc.metadata
            }));
        } catch (error) {
            console.error('Error retrieving context:', error);
            return [];
        }
    }

    async clearVectorStore() {
        try {
            this.vectorStore = await HNSWLib.fromDocuments([], this.embeddings);
            await chrome.storage.local.remove('RAG_VECTOR_STORE');
            return true;
        } catch (error) {
            console.error('Error clearing vector store:', error);
            return false;
        }
    }
}

export default new RAGManager(); 