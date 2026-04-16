import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-dark/50 border-t border-purple-500/20 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <i className="fas fa-parking text-2xl text-primary"></i>
              <span className="text-xl font-bold">Parkey</span>
            </div>
            <p className="text-gray-400 text-sm">
              La première plateforme de tokenisation de places de parking sur blockchain.
            </p>
          </div>

          {/* Plateforme */}
          <div>
            <h3 className="font-bold mb-4">Plateforme</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link to="/marketplace" className="hover:text-primary transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/create" className="hover:text-primary transition-colors">
                  Créer un Token
                </Link>
              </li>
              <li>
                <Link to="/my-tokens" className="hover:text-primary transition-colors">
                  Mes Tokens
                </Link>
              </li>
              <li>
                <Link to="/documentation" className="hover:text-primary transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h3 className="font-bold mb-4">Ressources</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link to="/guide" className="hover:text-primary transition-colors">
                  Guide
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-primary transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Communauté */}
          <div>
            <h3 className="font-bold mb-4">Communauté</h3>
            <div className="flex space-x-4">
              <Link
                to="/contact"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <i className="fab fa-twitter"></i>
              </Link>
              <Link
                to="/contact"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <i className="fab fa-discord"></i>
              </Link>
              <Link
                to="/contact"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <i className="fab fa-telegram"></i>
              </Link>
              <Link
                to="/contact"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
              >
                <i className="fab fa-github"></i>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2024 Parkey. Tous droits réservés. Propulsé par Ethereum.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;