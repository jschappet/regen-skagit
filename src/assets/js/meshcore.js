(() => {
  const panel = document.getElementById("meshcore-verification");
  const status = document.getElementById("meshcore-status");
  const login = document.getElementById("meshcore-login");
  const options = document.getElementById("meshcore-options");
  const instructions = document.getElementById("meshcore-instructions");
  const command = document.getElementById("meshcore-command");
  const form = document.getElementById("meshcore-confirm");
  const reply = document.getElementById("meshcore-reply");
  let transports = {};

  async function request(path, body) {
    const options = body === undefined ? {} : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const response = await fetch(`/api/meshcore/${path}`, options);
    if (response.status === 401 || response.status === 403) {
      login.hidden = false;
      throw new Error("Sign in, then return here to verify your connection.");
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "MeshCore verification is currently unavailable.");
    }
    return response.json();
  }

  function render(result) {
    transports = result.transports || transports;
    const canStart = result.state === "new" || result.state === "expired";
    const active = result.state === "waiting" || result.state === "received";
    options.hidden = !canStart;
    for (const button of options.querySelectorAll("button")) {
      button.hidden = !transports[button.dataset.transport];
    }
    instructions.hidden = !result.command;
    instructions.textContent = result.transport === "dm"
      ? `Save ${transports.dm || "the Skagit bot"} as a contact, then send this full command in a direct message to that contact.`
      : "Send this command to #skagit.";
    command.hidden = !result.command;
    command.textContent = result.command || "";
    form.hidden = !active;

    const messages = {
      new: transports.dm || transports.channel ? "Choose how to verify your connection." : "MeshCore verification is currently unavailable.",
      expired: "Your code expired. Start again when a verification option is available.",
      waiting: "Send the command below, then enter the code from the bot’s reply.",
      received: "The bot received your message. Enter the code from its reply.",
      confirmed: "Your MeshCore round trip is confirmed.",
    };
    status.textContent = messages[result.state];
  }

  async function update(path, body) {
    panel.setAttribute("aria-busy", "true");
    const buttons = panel.querySelectorAll("button");
    buttons.forEach(button => { button.disabled = true; });
    try {
      render(await request(path, body));
    } catch (error) {
      status.textContent = error.message;
    } finally {
      buttons.forEach(button => { button.disabled = false; });
      panel.removeAttribute("aria-busy");
    }
  }

  options.addEventListener("click", event => {
    const transport = event.target.dataset.transport;
    if (transport) update("start", { transport });
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    update("confirm", { passphrase: reply.value });
  });
  update("verification");
})();
