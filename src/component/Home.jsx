import './Home.css'
import { useState, useEffect } from 'react';
import { Info, Copy } from 'lucide-react';

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
    <main className="home-main">

    <div className="logoContainer">
      <img src="./images/logo.png" alt="LOGO" />
    </div>

        <div class="strip strip1"></div>
        <div class="strip strip2"></div>

      {/* Rules Button */}
      <button className="rules-button" onClick={() => setRulesPopup(true)}><span><Info className="rules-button-icon"/></span></button>

        <div className="tasks">
        
        <h2>COMPLETE TASKS TO BE ELIGIBLE FOR FIRST NFT DROP</h2>
        
          <div className="taskContainer">
          {/* Task 1: Discord */}
          <div className="task" id="task-discord">
            <div className="task-timeline">
              <div className="timeline-indicator" id="timeline-discord">
                <div className="timeline-circle">
                  <span className="checkmark">✓</span>
                </div>
                {/* <div className="timeline-line"></div> */}
              </div>
              <div className="task-content">
                <div className="task-info">
                  <p>Join Our Discord Community</p>
                  <button className="task-button btn2" id="discord-connect-btn" onClick={call('authenticateDiscord')}>CONNECT DISCORD</button>
                  <button className="task-button btn2" id="discord-join-btn" onClick={call('joinDiscordServer')} style={{ display: 'none', marginTop: 3 }}>JOIN DISCORD SERVER</button>
                  <button className="task-button btn2" id="discord-verify-btn" onClick={call('verifyDiscordJoin')} style={{ display: 'none', marginTop: 3 }}>VERIFY JOIN</button>
                </div>
              </div>
            </div>
          </div>

          {/* Task 2: Twitter/X */}
          <div className="task" id="task-follow">
            <div className="task-timeline">
              <div className="timeline-indicator" id="timeline-twitter">
                <div className="timeline-circle">
                  <span className="checkmark">✓</span>
                </div>
                {/* <div className="timeline-line"></div> */}
              </div>
              <div className="task-content">
                <div className="task-info">
                  <p>Follow Us on X</p>
                  <button className="task-button btn1" id="twitter-connect-btn" onClick={call('authenticateX')} disabled>CONNECT X</button>
                  <button className="task-button btn1" id="twitter-follow-btn" onClick={call('followTwitter')} style={{display: 'none', marginTop: 3}}>FOLLOW X</button>
                  <button className="task-button btn1" id="twitter-verify-btn" onClick={call('verifyTwitterFollow')} style={{display: 'none', marginTop: 3}}>VERIFY FOLLOW</button>
                </div>
              </div>
            </div>
          </div>

          {/* Task 3: Wallet */}
          <div className="task" id="task-address">
            <div className="task-timeline">
              <div className="timeline-indicator" id="timeline-wallet">
                <div className="timeline-circle">
                  <span className="checkmark">✓</span>
                </div>
              </div>
              <div className="task-content">
                <div className="task-info">
                  <p style={{display: 'none'}}>Submit Your Wallet Address</p>
                  <input className="address-input" type="text" placeholder="Enter your EVM address" id="evmAddress" disabled />
                  <button className="submit-button" id="wallet-submit-btn" onClick={call('submitAddress')} disabled>SUBMIT</button>
                </div>
              </div>
            </div>
          </div>
        </div>

         {/* Participant Counter */}
        <div className="participant-counter">
          <div className="participant-avatars">
            <div className="avatar-circle">
              <img src="/pfps/profileimg1.jpg" alt="Participant 1" />
            </div>
            <div className="avatar-circle">
              <img src="/pfps/profileimg2.jpg" alt="Participant 2" />
            </div>
            <div className="avatar-circle">
              <img src="/pfps/profileimg3.jpg" alt="Participant 3" />
            </div>
            <div className="avatar-circle">
              <img src="/pfps/profileimg4.jpg" alt="Participant 4" />
            </div>
            <div className="avatar-circle">
              <div className="avatar-plus">+</div>
            </div>
          </div>
          <div className="participant-count">
            <span id="total-participants">0</span> participants joined
          </div>
        </div>
      </div>

      <div className="refer" id="referral-section">
        <h2>REFER A FRIEND</h2>       
        <div id="referral-content" style={{display: 'none'}}>
          <div className="referral-content">
          <div className="referral-link-container">
            <input 
              type="text" 
              id="referral-link-input" 
              className="referral-input" 
              readOnly 
              placeholder="Complete all tasks to get your referral link"
            />
            <button 
              id="copy-referral-btn" 
              className="copy-referral-btn"
              onClick={call('copyReferralLink')}
            >
              <Copy className="copy-referral-btn-icon"/>
            </button>
          </div>

          <div className="referral-stats">
            <p id="referral-count">Referrals: <span id="referral-count-value">0</span></p>
          </div>
          </div>
          
          <button 
            id="share-on-x-btn" 
            className="share-on-x-btn"
            onClick={call('shareOnX')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            SHARE ON X
          </button>
          
        </div>
        
        <div id="referral-locked" style={{display: 'block'}}>
          <p className="referral-locked-text">Complete all tasks to unlock your referral link</p>
        </div>
      </div>

      {/* Rules */}
      {rulesPopup && (
      <div className="rulesPopUp">
      <div className="rules">
        <button className="close-x-button" onClick={() => setRulesPopup(false)}>&times;</button>
        <h3>NFT Drop Details</h3>
        <ul>
          <li>Active Discord role holders have higher chances to receive rare & legendary NFTs</li>
          <li>3 rarity tiers: Common, Rare, and Legendary</li>
          <li>10,000 total NFTs, only the luckiest users will receive one</li>
          <li>NFTs will be airdropped automatically to your wallet after the drop ends</li>
          <li>Complete all tasks to unlock your eligibility for the drop</li>
          <li>Referrals increase your chances - invite friends to join NEFTIT and boost your luck</li>
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
