import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import './App.css';

function App() {
  const [items, setItems]           = useState([]);
  const [newItem, setNewItem]       = useState({ name:'', code:'', quantity:'', unit:'' });
  const [editingIndex, setEditing]  = useState(null);
  const [editedQty, setEditedQty]   = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStock, setLowStock]     = useState([]);
  const [user, setUser]             = useState(null);
  const [authForm, setAuthForm]     = useState({ email:'', password:'' });
  const [showNotice, setShowNotice] = useState(false);

  const invCol = collection(db, 'inventory');

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  // Real‑time inventory listener
  useEffect(() => {
    if (!user) {
      setItems([]); 
      setLowStock([]); 
      return;
    }
    const unsub = onSnapshot(invCol, snap => {
      const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      setItems(data);
      setLowStock(data.filter(i => i.quantity < 5));
    });
    return () => unsub();
  }, [user]);

  // Auth handlers
  const handleAuthChange = e => setAuthForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const signInUser  = () => signInWithEmailAndPassword(auth, authForm.email, authForm.password).catch(alert);
  const signUpUser  = () => createUserWithEmailAndPassword(auth, authForm.email, authForm.password).catch(alert);
  const logoutUser  = () => signOut(auth);

  // Add or update item
  const addItem = async e => {
    e.preventDefault();
    const { name, code, quantity, unit } = newItem;
    if (!name||!code||!quantity||!unit) return alert('Fill all fields');
    const qty = parseInt(quantity,10);
    if (isNaN(qty)||qty<=0) return alert('Invalid qty');

    const existing = items.find(i=>i.code===code);
    if (existing) {
      const newQty = existing.quantity + qty;
      setItems(it=>it.map(i=>i.code===code?{...i,quantity:newQty}:i));
      await updateDoc(doc(db,'inventory',existing.id),{ quantity:newQty });
    } else {
      const ref = await addDoc(invCol,{ name, code, quantity:qty, unit });
      setItems(it=>[...it,{ id:ref.id, name, code, quantity:qty, unit }]);
    }

    // Clear input fields after add
    setNewItem({ name:'', code:'', quantity:'', unit:'' });
  };

  // Clear input fields without submitting
  const clearFields = () => {
    setNewItem({ name:'', code:'', quantity:'', unit:'' });
  };

  // Delete item
  const deleteItem = async id => {
    if (!window.confirm('Delete this item?')) return;
    setItems(it=>it.filter(i=>i.id!==id));
    await deleteDoc(doc(db,'inventory',id));
  };

  // Start editing
  const startEdit = (idx, qty) => {
    setEditing(idx);
    setEditedQty(qty.toString());
  };

  // Save edit, close immediately
  const saveEdit = async id => {
    const qty = parseInt(editedQty,10);
    if (isNaN(qty)||qty<0) return alert('Invalid quantity');
    setEditing(null);
    setItems(it=>it.map(i=>i.id===id?{...i,quantity:qty}:i));
    await updateDoc(doc(db,'inventory',id),{ quantity:qty });
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['Name','Code','Quantity','Unit'];
    const rows = items.map(i=>[i.name,i.code,i.quantity,i.unit]);
    let csv = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n'
      + rows.map(r=>r.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'inventory.csv';
    link.click();
  };

  // Filter items
  const filtered = items.filter(i=>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <h2>Inventory Management</h2>

      {!user ? (
        <div className="auth-form">
          <input name="email"    placeholder="Email"    onChange={handleAuthChange}/>
          <input name="password" type="password" placeholder="Password" onChange={handleAuthChange}/>
          <button onClick={signInUser}>Login</button>
          <button onClick={signUpUser}>Sign Up</button>
        </div>
      ) : (
        <>
          <div className="top-bar">
            <button onClick={logoutUser}>Logout</button>
            <button onClick={exportCSV}>Export CSV</button>
          </div>

          {lowStock.length > 0 && (
            <div className="notification-icon" onClick={() => setShowNotice(v=>!v)}>
              🔔
            </div>
          )}

          <div className={`notification-panel ${showNotice?'open':''}`} hidden={lowStock.length===0}>
            <strong>Low Stock:</strong>
            {lowStock.map(i=>(
              <div key={i.id}>{i.name} ({i.quantity} {i.unit})</div>
            ))}
          </div>

          <form className="form" onSubmit={addItem}>
            <input
              placeholder="Name"
              value={newItem.name}
              onChange={e=>setNewItem(n=>({...n,name:e.target.value}))}
            />
            <input
              placeholder="Code"
              value={newItem.code}
              onChange={e=>setNewItem(n=>({...n,code:e.target.value}))}
            />
            <input
              placeholder="Quantity"
              value={newItem.quantity}
              onChange={e=>setNewItem(n=>({...n,quantity:e.target.value}))}
            />
            <input
              placeholder="Unit"
              value={newItem.unit}
              onChange={e=>setNewItem(n=>({...n,unit:e.target.value}))}
            />
            <button type="submit">Add Item</button>
            <button type="button" onClick={clearFields}>Clear</button>
          </form>

          <input
            className="search"
            placeholder="Search..."
            value={searchTerm}
            onChange={e=>setSearchTerm(e.target.value)}
          />

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx)=>(
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.code}</td>
                  <td>
                    {editingIndex===idx ? (
                      <input
                        value={editedQty}
                        onChange={e=>setEditedQty(e.target.value)}
                        style={{ width:'60px' }}
                      />
                    ) : (
                      i.quantity
                    )}
                  </td>
                  <td>{i.unit}</td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={()=>deleteItem(i.id)}>Delete</button>
                      {editingIndex===idx
                        ? <button onClick={()=>saveEdit(i.id)}>Save</button>
                        : <button onClick={()=>startEdit(idx,i.quantity)}>Edit</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default App;
