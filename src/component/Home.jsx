
import './Home.css'

function Home() {
    // Helper to call legacy globals safely

    const call = (fn) => () => {
        if (typeof window[fn] === 'function') {
          window[fn]()
        } else {
          console.warn(`Global function ${fn} is not available yet.`)
        }
      }

    return (
       <main>

        <div className="statusContainer">
            <h1 className="status">WAITLIST IS CLOSED NOW!</h1>
        </div>
        

        <div className="tasks">
        <h3>Complete simple tasks to be eligible for first NFT Drop</h3>

        <div className="task" id="task-follow">
          <div className="task-info">
            <h4><span className='taskFollow'>{'->'}</span> Follow neftit on X</h4>
            <button className="task-button btn1" onClick={call('authenticateX')}>Connect X</button>
            <button className="task-button btn1" id="twitter-follow-btn" onClick={call('followTwitter')} style={{display: 'none', marginTop: 10}}>Follow X</button>
            <button className="task-button btn1" id="twitter-verify-btn" onClick={call('verifyTwitterFollow')} style={{display: 'none', marginTop: 10}}>Verify Follow</button>
          </div>
        </div>

        <div className="task" id="task-discord">
          <div className="task-info">
            <h4><span className='taskDiscord'>{'->'}</span> Join neftit Discord</h4>
            <button className="task-button btn2" id="discord-connect-btn" onClick={call('authenticateDiscord')}>Connect Discord</button>
            <button className="task-button btn2" id="discord-join-btn" onClick={call('joinDiscordServer')} style={{ display: 'none', marginTop: 10 }}>Join Discord Server</button>
            <button className="task-button btn2" id="discord-verify-btn" onClick={call('verifyDiscordJoin')} style={{ display: 'none', marginTop: 10 }}>Verify Join</button>
          </div>
        </div>

        <div className="task" id="task-address">
          <div className="task-info">
            <h4><span className='taskAddress'>{'->'}</span> Enter your EVM address</h4>
            <div className="address-input">
              <input type="text" placeholder="0x..." id="evmAddress" />
              <button className="submit-button" onClick={call('submitAddress')}>Submit</button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="rules">
        <h3>Rewards</h3>
        <p className="rule1"><span className='taskRule1'>{'->'}</span> 3 rarities in drop</p>
        <p className="rule2"><span className='taskRule2'>{'->'}</span> Discord role holders have most chances to get high tier NFT</p>
      </div>

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
