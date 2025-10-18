import './Home.css'
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

function Home() {
  // Helper to call legacy globals safely
  const call = (fn) => () => {
    if (typeof window[fn] === 'function') {
      window[fn]();
    } else {
      console.warn(`Global function ${fn} is not available yet.`);
    }
  };

  const [rulesPopup, setRulesPopup] = useState(false);

    useEffect(() => {
  if (rulesPopup) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden"; // lock html as well
  } else {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  }

  return () => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  };
}, [rulesPopup]);

  return (
    <main>

    <div className="logoContainer">
      <img src="./images/logo.png" alt="LOGO" />
    </div>

        <div class="strip strip1"></div>
        <div class="strip strip2"></div>

      {/* Rules Button */}
      <button className="rules-button" onClick={() => setRulesPopup(true)}><span><Info className="rules-button-icon"/></span>Rewards</button>

        <div className="tasks">
        <h2>COMPLETE TASKS TO BE ELIGIBLE FOR FIRST NFT DROP</h2>
        
          <div className="taskContainer">
          <div className="task" id="task-discord">
          <div className="task-info">
            <p>Join Our Discord Community</p>
            <button className="task-button btn2" id="discord-connect-btn" onClick={call('authenticateDiscord')}>CONNECT DISCORD</button>
            <button className="task-button btn2" id="discord-join-btn" onClick={call('joinDiscordServer')} style={{ display: 'none', marginTop: 10 }}>JOIN DISCORD SERVER</button>
            <button className="task-button btn2" id="discord-verify-btn" onClick={call('verifyDiscordJoin')} style={{ display: 'none', marginTop: 10 }}>VERIFY JOIN</button>
          </div>
        </div>

        <div className="task" id="task-follow">
          <div className="task-info">
            <p>Follow Us on X</p>
            <button className="task-button btn1" onClick={call('authenticateX')}>CONNECT X</button>
            <button className="task-button btn1" id="twitter-follow-btn" onClick={call('followTwitter')} style={{display: 'none', marginTop: 10}}>FOLLOW X</button>
            <button className="task-button btn1" id="twitter-verify-btn" onClick={call('verifyTwitterFollow')} style={{display: 'none', marginTop: 10}}>VERIFY FOLLOW</button>
          </div>
        </div>

        {/* EVM Address Task */}
        <div className="task" id="task-address">
          <div className="task-info">
              <input  className="address-input" type="text" placeholder="Enter your EVM address" id="evmAddress" />
              <button className="submit-button" onClick={call('submitAddress')}>SUBMIT</button>
          </div>
        </div>
        </div>
      </div>

      <div className="refer">
        <h2>REFER A FRIEND</h2>
        <p>Share the link with your friends and get rewards</p>
      </div>

      {/* Rules */}
      {rulesPopup && (
      <div className="rulesPopUp">
      <div className="rules">
        <button className="close-x-button" onClick={() => setRulesPopup(false)}>&times;</button>
        <h3>Rewards</h3>
        <ul>
        <li className="rule2">Discord role holders have most chances to get high tier NFT</li>
        <li className="rule1">3 rarities in drop</li>
        </ul>
        <button className="closeButton" onClick={() => setRulesPopup(false)}>Close</button>
        </div>
      </div>
      )}

      {/* Wallet Connection Modal */}
      <div className="modal" id="walletModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Connect Your Wallet</h3>
            <button className="close-button" onClick={call('closeModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <p>Connect your wallet to complete the task</p>
            <div className="wallet-options">
              <button className="wallet-option" onClick={() => call('connectMetaMask')()}>
                <i className="fab fa-ethereum" />
                <span>MetaMask</span>
              </button>
              <button className="wallet-option" onClick={() => call('connectWalletConnect')()}>
                <i className="fas fa-wallet" />
                <span>WalletConnect</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>
  )
}

export default Home;
