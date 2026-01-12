// src/pages/Landing.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Landing = () => {
  return (
    <div>
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>
            Invest in Premium <br />
            <span className="highlight">Real Estate on Chain</span>
          </h1>
          <p>
            Own fractional shares of high-yield properties securely using Blockchain.
            Start investing with as little as $50.
          </p>
          <div>
            <Link to="/register" className="btn-primary">Start Investing</Link>
            <a href="#process" className="btn-secondary">Learn More</a>
          </div>
        </div>
      </section>

      {/* Process Section */}
      {/* Process Section */}
      <section id="process" className="features">
        <div className="container">
          <div className="text-center">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '16px' }}>
              How Tokenization Works
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
              Three simple steps to start earning passive income.
            </p>
          </div>

          <div className="grid-3">
            {/* Card 1 */}
            <div className="card">
              <div className="card-icon">1</div>
              <h3>Asset Selection</h3>
              <p>Premium properties are vetted, legally structured, and minted as a unique NFT on the Blockchain.</p>
            </div>

            {/* Card 2 */}
            <div className="card">
              <div className="card-icon">2</div>
              <h3>Fractionalization</h3>
              <p>The NFT is split into thousands of tokens. You can buy these shares using MATIC instantly.</p>
            </div>

            {/* Card 3 */}
            <div className="card">
              <div className="card-icon">3</div>
              <h3>Ownership & Returns</h3>
              <p>Hold tokens in your wallet to prove ownership, trade them, or earn rental yield dividends.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;