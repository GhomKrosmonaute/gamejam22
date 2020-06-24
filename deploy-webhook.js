const webhook = require("webhook-discord");
const git = require("git-rev-sync");

const Hook = new webhook.Webhook(
  "https://discordapp.com/api/webhooks/725378552173822073/dweiOxK8MhZ9DX657iQo0GEWuwbpn0vENmKoGyfEoj2gScHtqIrmsp28ajFvybsaPdnK"
);

Hook.success(
  "Deployment",
  `Deployed commit ${git.short()} from branch ${git.branch()}`
);
