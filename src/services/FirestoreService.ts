import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type OrderByDirection,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

export interface OrderItem {
  id: string;
  description: string;
  price: number;
  stockId?: string;
}

export interface OrderDocument extends FirestoreDocument {
  name: string;
  last_4_digits_phone: string;
  orders: OrderItem[];
  status: "pending" | "packing" | "sent" | "hnr";
  payment_status: "full" | "half" | "none";
  is_book_paid?: boolean;
  is_shipping_paid?: boolean;
  is_packing_fee_applied?: boolean;
  updated_at: string;
  created_at: string;
  delivery_address?: string;
  delivery_type: string;
  tracking_number?: string;
  additional_notes?: string;
  unique_code?: number;
}

export interface StockOpnameDocument extends FirestoreDocument {
  book_name: string;
  price: number;
  stock: number;
  created_at?: string;
  is_marketed_ls?: boolean;
  sell_price?: number;
}

export interface ExpenseDocument extends FirestoreDocument {
  name: string;
  price: number;
  qty: number;
  total: number;
  created_at?: string;
}

export interface HistoricalDataDocument extends FirestoreDocument {
  description: string;
  capital: number;
  revenue: number;
  profit: number;
  total_books: number;
  created_at?: string;
}

class FirestoreService {
  async getCollection(
    collectionName: string,
    orderByField?: string,
    orderDirection: OrderByDirection = "asc",
  ): Promise<FirestoreDocument[]> {
    try {
      let q = collection(db, collectionName);
      let queryRef;
      if (orderByField) {
        queryRef = query(q, orderBy(orderByField, orderDirection));
      } else {
        queryRef = q;
      }

      const snapshot = await getDocs(queryRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreDocument[];
    } catch (error) {
      console.error(`Error getting collection ${collectionName}:`, error);
      throw error;
    }
  }

  async getDocument(
    collectionName: string,
    docId: string,
  ): Promise<FirestoreDocument> {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreDocument;
    } else {
      throw new Error("Document not found");
    }
  }

  async addDocument(collectionName: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: Timestamp.now().toDate().toISOString(),
      updated_at: Timestamp.now().toDate().toISOString(),
    });
    return docRef.id;
  }

  async updateDocument(
    collectionName: string,
    docId: string,
    data: any,
  ): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updated_at: Timestamp.now().toDate().toISOString(),
    });
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  }
}

export default new FirestoreService();
