import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits } from "discord.js";
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const TOKEN = process.env.DISCORD_TOKEN// Remplace par ton token Discord

client.once("ready", () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});
let hiddenPlayer = null;
let hiddenChannelId = null;
const scores = {};
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (message.content === "!leaderboard") {
        if (Object.keys(scores).length === 0) {
            return message.reply("Personne n'a encore marqué de point !");
        }

        const leaderboard = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const lines = await Promise.all(leaderboard.map(async ([userId, score], index) => {
            try {
                const user = await client.users.fetch(userId);
                return `#${index + 1} - **${user.username}** : ${score} point${score > 1 ? "s" : ""}`;
            } catch (e) {
                return `#${index + 1} - Utilisateur inconnu : ${score} points`;
            }
        }));

        message.channel.send(`🏆 **Leaderboard Cache-Cache** 🕵️\n\n${lines.join("\n")}`);
    }
    if (message.content.startsWith("!hide")) {
        if (hiddenPlayer) {
            return message.reply("Une partie est déjà en cours !");
        }
    
        const args = message.content.split(" ").slice(1); // récupère les mots après !hide
        const categoryKeyword = args.join(" ").toLowerCase();
    
        let channels;
    
        if (!categoryKeyword) {
            // !hide → tous les salons publics
            channels = message.guild.channels.cache.filter(ch => {
                return (
                    ch.type === 0 && // texte
                    ch.id !== message.channel.id &&
                    ch.viewable &&
                    ch.permissionsFor(message.guild.roles.everyone)?.has('SendMessages')
                );
            });
        } else {
            // !hide cat → chercher dans une catégorie (privée ou publique)
            const matchingCategory = message.guild.channels.cache.find(ch => {
                return ch.type === 4 && ch.name.toLowerCase().includes(categoryKeyword); // type 4 = category
            });
    
            if (!matchingCategory) {
                return message.reply(`❌ Catégorie "${categoryKeyword}" introuvable.`);
            }
    
            channels = message.guild.channels.cache.filter(ch => {
                return (
                    ch.type === 0 &&
                    ch.parentId === matchingCategory.id &&
                    ch.id !== message.channel.id
                );
            });
        }
    
        if (!channels.size) {
            return message.reply("❌ Aucun salon trouvé pour se cacher.");
        }
    
        const randomChannel = channels.random();
    
        hiddenPlayer = message.author.id;
        hiddenChannelId = randomChannel.id;
    
        const zoneText = categoryKeyword ? `dans la catégorie **${categoryKeyword}**` : "quelque part dans le serveur";
        await message.reply(`${message.author.username} s'est caché ${zoneText}... 🕵️‍♂️ Bonne chance ! Pour le trouver faites !seek dans les salons`);
    }
    

    if (message.content === "!seek") {
        if (!hiddenPlayer) {
            return message.reply("Personne ne s'est encore caché !");
        }

        if (message.channel.id === hiddenChannelId) {
            const hider = await message.guild.members.fetch(hiddenPlayer);
            await message.channel.send(`🎉 Bravo ${message.author.username} ! Tu as trouvé ${hider.user.username} !`);
            if (!scores[message.author.id]) {
                scores[message.author.id] = 0;
            }
            scores[message.author.id] += 1;
            // Réinitialiser
            hiddenPlayer = null;
            hiddenChannelId = null;
        } else {
            await message.reply("🔍 Hmm... Personne ne se cache ici !");
        }
    }
});

client.login(TOKEN);