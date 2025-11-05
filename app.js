// app.js - paste entire file into repo root
let walletAddress = null;

// Wallet detection - priority: Backpack -> MetaMask -> OKX
function detectProvider() {
  // Backpack (Solana) may expose window.backpack or window.solana with isBackpack
  if (window.backpack?.ethereum) return { type: "backpack", provider: window.backpack.ethereum };
  if (window.solana && window.solana.isBackpack) return { type: "backpack", provider: window.solana };
  // MetaMask / EVM
  if (window.ethereum && window.ethereum.isMetaMask) return { type: "metamask", provider: window.ethereum };
  // OKX wallet (example)
  if (window.okxwallet?.ethereum) return { type: "okx", provider: window.okxwallet.ethereum };
  // Any injected ethereum provider fallback
  if (window.ethereum) return { type: "ethereum", provider: window.ethereum };
  return null;
}

// Connect wallet (unified)
async function connectWallet() {
  try {
    const p = detectProvider();
    if (!p) {
      alert("Please install Backpack (Solana) or MetaMask/OKX (EVM)");
      return;
    }

    const provider = p.provider;
    if (p.type === "backpack" && provider.connect) {
      // Solana style
      const res = await provider.connect();
      walletAddress = res?.publicKey?.toString?.() || res?.toString?.();
    } else {
      // EVM style
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      walletAddress = accounts[0];
    }

    document.getElementById("walletText").innerText = "Wallet: " + walletAddress;
    document.getElementById("wAddr").innerText = walletAddress;
    document.getElementById("scanBtn").disabled = false;
  } catch (err) {
    console.error("connect error", err);
    alert("Wallet connection failed: " + (err?.message || err));
  }
}

// Generate soul points (try CARV API, fallback to random)
async function fetchSoulPoints(address) {
  try {
    // Try CARV API – if available; this endpoint is illustrative and may differ
    const carvRes = await fetch(`https://api.carv.io/v1/user/soul?walletAddress=${encodeURIComponent(address)}`);
    if (carvRes.ok) {
      const j = await carvRes.json();
      const score = j?.data?.soulScore;
      if (typeof score === "number") return score;
    }
  } catch (e) {
    // ignore and fallback
    console.warn("carv api fail", e);
  }
  // Fallback random 40-100
  return Math.floor(Math.random() * 61) + 40;
}

// Call your Vercel serverless function /api/ask
async function getAIInsight(wallet, carvUid, soulScore) {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, carvUid, soulScore })
    });
    const data = await res.json();
    // backend returns { answer: "..." } or { insight: "..." } — accept both
    return data?.answer || data?.insight || data?.message || null;
  } catch (e) {
    console.error("AI fetch error", e);
    return null;
  }
}

// Scan button flow
async function scanSoul() {
  if (!walletAddress) {
    alert("Connect wallet first");
    return;
  }

  const carvUid = (document.getElementById("carvUid").value || "").trim() || "Not Provided";
  document.getElementById("uidText").innerText = carvUid;

  // show spinner
  const insightEl = document.getElementById("insightText");
  const resultBox = document.getElementById("resultBox");
  resultBox.style.display = "block";
  insightEl.innerHTML = '<div class="spinner"></div> Channeling CARV AI...';

  // soul points
  const soulPoints = await fetchSoulPoints(walletAddress);

  // AI insight (passes soulPoints)
  const aiText = await getAIInsight(walletAddress, carvUid, soulPoints);

  document.getElementById("soulPoints").innerText = soulPoints;
  insightEl.innerText = aiText || "Your soul whispers of building — scan again for a fresher insight.";

  // share button
  document.getElementById("shareBtn").onclick = () => {
    const short = walletAddress?.slice(0,6) + "..." + walletAddress?.slice(-4);
    const tweet = `I scanned my CARV soul 🔮\nWallet: ${short}\nSoul Points: ${soulPoints}\n${(aiText||"")} \nhttps://carvex-soul-scanner.vercel.app`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, "_blank");
  };
}

// theme toggle (simple)
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// wire buttons
document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("scanBtn").addEventListener("click", scanSoul);
