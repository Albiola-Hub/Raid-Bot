const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const path = require('path');

// --- 1. EXPRESS SERVER SETUP ---
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// --- 2. DISCORD BOT SETUP ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = "1448909951602004008"; // Ang ID mo

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

let activeRaids = new Map();

// Slash Command Registration (Everywhere/User-Install Ready)
const commands = [
    new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Simulan ang pagpapadala ng messages.')
        .addStringOption(opt => opt.setName('text').setDescription('Anong message?').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Ilang beses?').setRequired(false))
        .addBooleanOption(opt => opt.setName('loop').setDescription('Infinite loop?').setRequired(false))
        .setContexts([0, 1, 2]) // Guilds, DMs, Private Groups
        .setIntegrationTypes([0, 1]), // Server at User Install
    
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Ititigil ang raid sa context na ito.')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Raid commands registered successfully!');
    } catch (e) { console.error(e); }
})();

// --- 3. BOT LOGIC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // SECURITY CHECK: Ikaw lang dapat!
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Error: Unauthorized. Only the Bot Owner can deploy this protocol.', ephemeral: true });
    }

    const channelId = interaction.channelId;

    if (interaction.commandName === 'raid') {
        const text = interaction.options.getString('text');
        const amount = interaction.options.getInteger('amount') || 0;
        const isLoop = interaction.options.getBoolean('loop') || false;

        if (activeRaids.has(channelId)) {
            return interaction.reply({ content: 'May raid na rito! Gamitin ang `/stop`.', ephemeral: true });
        }

        activeRaids.set(channelId, true);
        await interaction.reply({ content: `🚀 Raid started! Text: "${text}"`, ephemeral: true });

        let count = 0;
        while (activeRaids.has(channelId)) {
            if (!isLoop && amount > 0 && count >= amount) {
                activeRaids.delete(channelId);
                break;
            }
            try {
                await interaction.channel.send(text);
                count++;
            } catch (err) {
                activeRaids.delete(channelId);
                break;
            }
            await new Promise(r => setTimeout(r, 1500)); 
        }
    }

    if (interaction.commandName === 'stop') {
        if (!activeRaids.has(channelId)) return interaction.reply({ content: 'Walang raid dito.', ephemeral: true });
        activeRaids.delete(channelId);
        await interaction.reply('🛑 Raid protocol terminated.');
    }
});

client.login(TOKEN);
