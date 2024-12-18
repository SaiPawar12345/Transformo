import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiEdit, FiTrash2, FiUser, FiCreditCard, FiArrowLeft } from 'react-icons/fi';
import './payment.css';

const tierPricing = {
    tier1: { weekly: 10, monthly: 35, yearly: 400 },
    tier2: { weekly: 20, monthly: 70, yearly: 800 },
    tier3: { weekly: 30, monthly: 100, yearly: 1200 },
};

const Payment = () => {
    const [user, setUser] = useState(null);
    const [billing, setBilling] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [error, setError] = useState(null);
    const [personalDetails, setPersonalDetails] = useState({ name: '', email: '' });
    const [tier, setTier] = useState('tier1');
    const [paymentFrequency, setPaymentFrequency] = useState('weekly');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchBillingAndReceipts(currentUser.uid);
            } else {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const fetchBillingAndReceipts = async (userId) => {
        try {
            const billingRef = collection(db, 'billing');
            const receiptsRef = collection(db, 'receipts');
            const billingSnapshot = await getDocs(query(billingRef, where('userId', '==', userId)));
            const receiptsSnapshot = await getDocs(query(receiptsRef, where('userId', '==', userId)));

            const userBilling = billingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const userReceipts = receiptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setBilling(userBilling);
            setReceipts(userReceipts);
        } catch (error) {
            setError('Error fetching billing and receipts');
        }
    };

    const handlePersonalDetailsChange = (e) => {
        const { name, value } = e.target;
        setPersonalDetails(prevDetails => ({ ...prevDetails, [name]: value }));
    };

    const handleTierChange = (e) => {
        setTier(e.target.value);
    };

    const handlePaymentFrequencyChange = (e) => {
        setPaymentFrequency(e.target.value);
    };

    const calculateAmount = () => {
        return tierPricing[tier][paymentFrequency];
    };

    // Load Razorpay script
    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Initialize Razorpay payment
    const initiatePayment = async () => {
        const res = await loadRazorpay();
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        const options = {
            key: 'rzp_test_9zwqD6dQkgBJo8',
            amount: calculateAmount() * 100, // Convert to paise
            currency: 'INR',
            name: 'TransformoDocs',
            description: 'Document Processing Payment',
            handler: function (response) {
                alert('Payment successful! Payment ID: ' + response.razorpay_payment_id);
                // Add payment record to Firestore
                addPaymentRecord(response.razorpay_payment_id, calculateAmount());
            },
            prefill: {
                name: user?.email?.split('@')[0],
                email: user?.email,
            },
            theme: {
                color: '#3399cc'
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment popup closed by user');
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error);
            alert('Payment failed! Reason: ' + response.error.description);
        });
        rzp.open();
    };

    const addPaymentRecord = async (paymentId, amount) => {
        try {
            await addDoc(collection(db, 'payments'), {
                userId: user.uid,
                paymentId: paymentId,
                amount: amount,
                timestamp: new Date(),
                status: 'completed'
            });
            fetchBillingAndReceipts(user.uid);
        } catch (error) {
            console.error('Error adding payment record:', error);
            setError('Failed to record payment');
        }
    };

    return (
        <div className="payment-container">
            <div className="back-button" onClick={() => navigate('/dashboard')}>
                <FiArrowLeft /> Back to Dashboard
            </div>

            <h1 className="payment-title">Payment Details</h1>

            <div className="personal-details">
                <h2>Personal Details</h2>
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={personalDetails.name}
                    onChange={handlePersonalDetailsChange}
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={personalDetails.email}
                    onChange={handlePersonalDetailsChange}
                />
            </div>

            <div className="tier-selection">
                <h2>Select Tier</h2>
                <select value={tier} onChange={handleTierChange}>
                    <option value="tier1">Tier 1</option>
                    <option value="tier2">Tier 2</option>
                    <option value="tier3">Tier 3</option>
                </select>
            </div>

            <div className="payment-frequency">
                <h2>Payment Frequency</h2>
                <select value={paymentFrequency} onChange={handlePaymentFrequencyChange}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            <div className="payment-details">
                <h2>Payment Details</h2>
                <p>User ID: {user?.uid}</p>
                <p>Selected Tier: {tier}</p>
                <p>Payment Frequency: {paymentFrequency}</p>
                <p className="amount">Amount: ₹{calculateAmount()}</p>
            </div>

            <button className="payment-button" onClick={initiatePayment}>
                <FiCreditCard /> Pay ₹{calculateAmount()}
            </button>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default Payment;
