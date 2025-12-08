import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";
import Navigation from './Navbar';
import Home from './Home.js'
import AdminDashboard from './AdminDashboard.js'
import Create from './Create.js'
import MyListedItems from './MyListedItems.js'
import MyPurchases from './MyPurchases.js'
import MyOffers from './MyOffers.js'
import MySentOffers from './MySentOffers.js'
import MarketplaceAbi from '../contractsData/Marketplace.json'
import MarketplaceAddress from '../contractsData/Marketplace-address.json'
import NFTAbi from '../contractsData/NFT.json'
import NFTAddress from '../contractsData/NFT-address.json'
import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Spinner } from 'react-bootstrap'

import './App.css';

function App() {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState({})
  const [marketplace, setMarketplace] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [isIssuer, setIsIssuer] = useState(false)

  // MetaMask Login/Connect
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });

          if (accounts.length > 0) {
            setAccount(accounts[0]);
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
           
            loadContracts(signer);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkWalletConnection();
  }, []);
  const web3Handler = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      setAccount(accounts[0])
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()

      loadContracts(signer)
    } catch (error) {
      console.error("Error connecting to MetaMask:", error)
      alert("Failed to connect to MetaMask. Please try again.")
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setNFT({})
    setMarketplace({})
    setLoading(true)
    if (window.ethereum && window.ethereum.removeAllListeners) {
      window.ethereum.removeAllListeners('chainChanged')
      window.ethereum.removeAllListeners('accountsChanged')
    }
  }

  const changeWallet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{
          eth_accounts: {}
        }]
      });

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        loadContracts(signer);
      }
    } catch (error) {
      console.error("Error changing wallet:", error);
      if (error.code === 4001) {
        console.log("User cancelled wallet selection");
      }
    }
  };

  const loadContracts = async (signer) => {
    try {
      const marketplace = new ethers.Contract(MarketplaceAddress.address, MarketplaceAbi.abi, signer)
      setMarketplace(marketplace)
      const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer)
      setNFT(nft)

      window.marketplace = marketplace;
      window.nft = nft;

      const ADMIN_ROLE = await marketplace.ADMIN_ROLE()
      const ISSUER_ROLE = await marketplace.ISSUER_ROLE()
      
      const adminCheck = await marketplace.hasRole(ADMIN_ROLE, await signer.getAddress())
      const issuerCheck = await marketplace.hasRole(ISSUER_ROLE, await signer.getAddress())

      setIsAdmin(adminCheck)
      setIsIssuer(issuerCheck)

      console.log("Is Admin:", adminCheck)
      console.log("Is Issuer:", issuerCheck)
      
      setLoading(false);

      setupEventListeners()
    } catch (error) {
      console.error("Error loading contracts:", error)
      setLoading(false)
    }
  }

  const setupEventListeners = () => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      })

      window.ethereum.on('accountsChanged', async function (accounts) {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          setAccount(accounts[0]);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          loadContracts(signer);
        }
      })
    }
  }

  return (
    <BrowserRouter>
      <div className="App">
        <>
          <Navigation 
            web3Handler={web3Handler} 
            account={account}
            disconnectWallet={disconnectWallet}
            changeWallet={changeWallet}
            isAdmin={isAdmin}
            isIssuer={isIssuer}
          />
        </>
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
              <Spinner animation="border" style={{ display: 'flex' }} />
              <p className='mx-3 my-0'>Awaiting Metamask Connection...</p>
            </div>
          ) : (
            <Routes>
              <Route path="/home" element={
                <Home marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/create" element={
                <Create marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-listed-items" element={
                <MyListedItems marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-purchases" element={
                <MyPurchases marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-offers" element={
                <MyOffers marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-sent-offers" element={
                <MySentOffers marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/admin" element={
                <AdminDashboard marketplace={marketplace} account={account} isAdmin={isAdmin} />
              } />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>

  );
}

export default App;

