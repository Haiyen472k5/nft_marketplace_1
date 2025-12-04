import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";
import Navigation from './Navbar';
import Home from './Home.js'
import Create from './Create.js'
import MyListedItems from './MyListedItems.js'
import MyPurchases from './MyPurchases.js'
import MarketplaceAbi from '../contractsData/Marketplace.json'
import MarketplaceAddress from '../contractsData/Marketplace-address.json'
import NFTAbi from '../contractsData/NFT.json'
import NFTAddress from '../contractsData/NFT-address.json'
import { useState } from 'react'
import { ethers } from "ethers"
import { Spinner } from 'react-bootstrap'

import './App.css';

function App() {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState({})
  const [marketplace, setMarketplace] = useState({})

  // MetaMask Login/Connect
  const web3Handler = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{
          eth_accounts: {}
        }]
      });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      setAccount(accounts[0])
      // Get provider from Metamask
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      // Set signer
      const signer = provider.getSigner()

      loadContracts(signer)
    } catch (error) {
      console.error("Error connecting to MetaMask:", error)
      alert("Failed to connect to MetaMask. Please try again.")
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null)
    setNFT({})
    setMarketplace({})
    setLoading(true)
    // Remove listeners
    if (window.ethereum && window.ethereum.removeAllListeners) {
      window.ethereum.removeAllListeners('chainChanged')
      window.ethereum.removeAllListeners('accountsChanged')
    }
  }

  // Change wallet - disconnect current and allow connecting new one
  const changeWallet = async () => {
    // Không cần disconnect, trực tiếp mở popup chọn tài khoản
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{
          eth_accounts: {}
        }]
      });

      // Lấy tài khoản mới sau khi user chọn
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        // Reload contracts với tài khoản mới
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        loadContracts(signer);
      }
    } catch (error) {
      console.error("Error changing wallet:", error);
      if (error.code === 4001) {
        // User rejected the request
        console.log("User cancelled wallet selection");
      }
    }
  };

  const loadContracts = async (signer) => {
    try {
      // Get deployed copies of contracts
      const marketplace = new ethers.Contract(MarketplaceAddress.address, MarketplaceAbi.abi, signer)
      setMarketplace(marketplace)
      const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer)
      setNFT(nft)

      window.marketplace = marketplace;
      window.nft = nft;
      const itemCount = await marketplace.itemCount();
      setLoading(false);



      // Setup listeners after contracts are loaded
      setupEventListeners()
    } catch (error) {
      console.error("Error loading contracts:", error)
      setLoading(false)
    }
  }

  const setupEventListeners = () => {
    if (window.ethereum) {
      // Chain changed - reload page
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      })

      // Account changed - reload with new account
      window.ethereum.on('accountsChanged', async function (accounts) {
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnectWallet()
        } else {
          // User switched account
          setAccount(accounts[0])
          await web3Handler()
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
              <Route path="/" element={
                <Home marketplace={marketplace} nft={nft} />
              } />
              <Route path="/create" element={
                <Create marketplace={marketplace} nft={nft} />
              } />
              <Route path="/my-listed-items" element={
                <MyListedItems marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-purchases" element={
                <MyPurchases marketplace={marketplace} nft={nft} account={account} />
              } />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>

  );
}

export default App;

