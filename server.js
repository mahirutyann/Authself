const express = require("express");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

let bots = []; // 複数Bot管理 [{token, client, botId}]

// Bot TokenからBot ID取得
app.post("/add-bot", async (req, res) => {
    const { token } = req.body;
    try {
        const client = new Client({ intents: [GatewayIntentBits.Guilds] });
        await client.login(token);

        // ボタン押しイベント
        client.on("interactionCreate", async interaction => {
            if (!interaction.isButton()) return;
            if (interaction.customId.startsWith("verify_")) {
                const roleId = interaction.customId.split("_")[1];
                const member = interaction.member;
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(roleId);
                    await interaction.reply({ content: "ロールを付与しました！", ephemeral: true });
                } else {
                    await interaction.reply({ content: "すでにロールを持っています。", ephemeral: true });
                }
            }
        });

        const botId = client.user.id;
        bots.push({ token, client, botId });
        res.status(200).json({ botId });
    } catch (err) {
        console.log(err);
        res.status(400).send("Bot Tokenが正しくありません。");
    }
});

// Bot IDから招待リンク生成
app.post("/generate-invite", (req, res) => {
    const { botId } = req.body;
    const bot = bots.find(b => b.botId === botId);
    if (!bot) return res.status(400).send("Botが存在しません。");
    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;
    res.status(200).send(inviteLink);
});

// 認証パネル作成
app.post("/create-panel", async (req, res) => {
    const { botId, guildId, channelId, roleId } = req.body;
    const bot = bots.find(b => b.botId === botId);
    if (!bot) return res.status(400).send("Botが存在しません。");

    try {
        const guild = await bot.client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);

        const embed = new EmbedBuilder()
            .setTitle("認証パネル")
            .setDescription("下のボタンを押すと認証され、ロールが付与されます！")
            .setColor("Red");

        const button = new ButtonBuilder()
            .setCustomId(`verify_${roleId}`)
            .setLabel("認証する")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
        res.status(200).send("認証パネルを送信しました！");
    } catch (err) {
        console.log(err);
        res.status(500).send("パネル作成中にエラーが発生しました。");
    }
});

app.listen(3000, () => console.log("サーバー起動 → http://localhost:3000"));