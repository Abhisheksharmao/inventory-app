import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', code: '', quantity: '', unit: '', low: '' });
  const [editingIndex, setEditing] = useState(null);
  const [editedQty, setEditedQty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStock, setLowStock] = useState([]);
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  const invCol = collection(db, 'inventory');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (!u) {
        setItems([]);
        setLowStock([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = onSnapshot(invCol, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data);
      setLowStock(data.filter(i => i.quantity < i.low));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleAuthChange = e =>
    setAuthForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const signInUser = () =>
    signInWithEmailAndPassword(auth, authForm.email, authForm.password).catch(alert);

  const logoutUser = () => signOut(auth);

  const addItem = async e => {
    e.preventDefault();
    const { name, code, quantity, unit, low } = newItem;
    if (!name || !code || !quantity || !unit) return alert('Fill all fields');
    const qty = parseInt(quantity, 10);
    const lowVal = parseInt(low, 10);
    if (isNaN(qty) || isNaN(lowVal)) return alert('Invalid quantity or low stock value');
    const existing = items.find(i => i.code === code);
    if (existing) {
      const newQty = existing.quantity + qty;
      await updateDoc(doc(db, 'inventory', existing.id), { quantity: newQty });
    } else {
      await addDoc(invCol, { name, code, quantity: qty, unit, low: lowVal });
    }
    setNewItem({ name: '', code: '', quantity: '', unit: '', low: '' });
  };

  const clearFields = () => {
    setNewItem({ name: '', code: '', quantity: '', unit: '', low: '' });
  };

  const deleteItem = async id => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'inventory', id));
  };

  const startEdit = (idx, qty) => {
    setEditing(idx);
    setEditedQty(qty.toString());
  };

  const saveEdit = async id => {
    const qty = parseInt(editedQty, 10);
    if (isNaN(qty)) return alert('Invalid quantity');
    setEditing(null);
    await updateDoc(doc(db, 'inventory', id), { quantity: qty });
  };

  const exportCSV = () => {
    const headers = ['Name', 'Code', 'Quantity', 'Unit', 'Low Stock Limit'];
    const rows = items.map(i => [i.name, i.code, i.quantity, i.unit, i.low]);
    let csv = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n'
      + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'inventory.csv';
    link.click();
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <h2>Mexmon Technologies</h2>

      {!user ? (
        <div className="login-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px',maxHeight:"600px", maxWidth: '300px', margin: 'auto' }}>
          <h1>welcome,</h1>
          <p>login to continue</p>
          <input name="email" placeholder="Email" onChange={handleAuthChange} />
          <input name="password" type="password" placeholder="Password" onChange={handleAuthChange} />
          <button onClick={signInUser}>Login</button>
        </div>
      ) : (
        <>
          <div className="top-bar">
            <button onClick={logoutUser}>🔓 LOG OUT</button>
            <button onClick={exportCSV}>⬇️ EXPORT DATA</button>
          </div>

          {lowStock.length > 0 && (
            <div className="notification-icon" onClick={() => setShowNotice(!showNotice)}>
              🔔
            </div>
          )}

          <div className={`notification-panel ${showNotice ? 'open' : ''}`} hidden={lowStock.length === 0}>
            <strong>Low Stock:</strong>
            {lowStock.map(i => (
              <div key={i.id}>{i.name} ({i.quantity} {i.unit})</div>
            ))}
          </div>

          <form className="form" onSubmit={addItem}>
            <input placeholder="Name" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} />
            <input placeholder="Code" value={newItem.code} onChange={e => setNewItem(n => ({ ...n, code: e.target.value }))} />
            <input placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem(n => ({ ...n, quantity: e.target.value }))} />
            <input placeholder="Unit" value={newItem.unit} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value }))} />
            <input placeholder="Low Stock Limit" value={newItem.low} onChange={e => setNewItem(n => ({ ...n, low: e.target.value }))} />
            <button type="submit">Add</button>
            <button type="button" onClick={clearFields}>Clear</button>
          </form>

          <input className="search" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

          {loading ? <p>Loading...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Low</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i, idx) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.code}</td>
                    <td>
                      {editingIndex === idx ? (
                        <input value={editedQty} onChange={e => setEditedQty(e.target.value)} style={{ width: '50px' }} />
                      ) : i.quantity}
                    </td>
                    <td>{i.unit}</td>
                    <td>{i.low}</td>
                    <td data-label="Actions">
  <div className="action-buttons">
    <button onClick={() => deleteItem(i.id)} className="delete">❌ DELETE</button>
    {editingIndex === idx ? (
      <button onClick={() => saveEdit(i.id)} className="save">💾 SAVE</button>
    ) : (
      <button onClick={() => startEdit(idx, i.quantity)} className="edit">✏️ EDIT</button>
    )}
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default App;
