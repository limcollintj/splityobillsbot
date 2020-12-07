require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;

// Created instance of TelegramBot
const bot = new TelegramBot(token, {
    polling: true
});



// In-memory storage
// groupID to UserIDs object
const groupMembers = {}




// 
// Listener (handler) for telegram's /start event
// This event happened when you start the conversation with both by the very first time
// Provide the list of available commands
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        `
            Welcome to splityobills bot. This bot helps you tally what the easiest way to settle bills are. 
Format is:
/splitbill -
members: member name, member name..,

<payer name, reason>: <amount paid> $ <payee name-amount>, <payee name-amount>,...

If you want to split with all members, specify 'all' in the <payee name -amount> region
E.g. : charlie, steak : 20 $ all - This splits charlie's bill with all the members

If you want to split equally with some members, specify the member's names
E.g. : bob, pizza: 10, $bob, charlie, alice - This splits bob's bill equally among bob, charlie and alice

If you want to split unevenly, specify <payee name-amount>
E.g. : alice, sausage: 20 $ bob-5, charlie-15 - This splits alice's bill where bob pays $15 and charlie pays $5. Note that if the inputs and outputs dont add up, you will receive an error.


Example:
/splitbill -
members: alice, bob, charlie
charlie, steak : 20 $ all
alice, sausage: 20 $ bob-5, charlie-15
bob, pizza: 10, $bob, charlie, alice

Reply: 
Pay up pay up: 

bob pay alice $5.00 
charlie pay alice $5.00
` 
    );
});

// Make capital letters to lowercase
// make /n unimportant

bot.onText(/\/splitbill/, (msg,match) => {
    const chatId = msg.chat.id;
    let input = match.input.split("\n");
    input.shift();
    let balance = {};

    // Takes out any apaces
    input = input.filter( temp => {
        return temp.trim() !== "";
    })

    try{
        let areMembersSpecified = false;

        if(input[0].split(":")[0].toLowerCase() === 'members'){
            let members = input[0].split(":")[1].split(",");
            members = members.map((name) => name.trim());
    
            // Create a new balance object for each user
            members.forEach((username) => {
                username = username.toLowerCase();
                balance[username] = 0; 
            });
            // Clear the member input
            input.shift();
            areMembersSpecified = true;
        }
    
        // The transaction array
        input.forEach((transaction) => {

            const payerDetails = transaction.split('$')[0];
            const payeeDetails = transaction.split('$')[1].trim();

       
            const payer = payerDetails.split(':')[0].split(",")[0].trim().toLowerCase();
            const paymentAmount = parseFloat(payerDetails.split(':')[1].trim());

                
    
            if(!(payer in balance)){
                balance[payer] = 0;
            }

            // Add to the payer's balance
            balance[payer] = balance[payer] + parseFloat(paymentAmount);
    
            // Deduct from everyone's balance
            if(payeeDetails.split(",").includes('all')){
                // Handles the all keyword
                if(!areMembersSpecified){
                  throw 'membersNotSpecifiedException';                
                }
                
                const deduct = paymentAmount / Object.keys(balance).length;

                for(payee in balance){
                    balance[payee] -= deduct;
                }
            }
            // Deduct only the payee's balances
            else{

                let dets = payeeDetails.split(',');
 
                // Filter out the empty strings
                dets = dets.filter((det) => {
                    return (det.trim() !== "");
                })
                
                dets.forEach((temp) => {
                    temp = temp.trim();
                    const nameAmount = temp.split("-");
                    const payeeName = nameAmount[0].trim().toLowerCase();
 
                    // If the amount if not specified
                        if(nameAmount.length == 1){

                            payeeName.split(" ").forEach((check) => {
                                if(!isNaN(parseInt(check))){
                                    throw 'No Dash Error';
                                }
                            })
                            const amount = paymentAmount / dets.length;
                            if(!(payeeName in balance)){
                                balance[payeeName] = 0;
                            }
                            balance[payeeName] = balance[payeeName] - amount;
                        }
                        else if(nameAmount.length == 2){
                            const amount = parseFloat(nameAmount[1].trim());
                            if(!(payeeName in balance)){
                                balance[payeeName] = 0;
                            }
                            
                            balance[payeeName] = balance[payeeName] - amount;
                        }
                        else{
                            throw 'error'
                        }
            
                    
                })
            }
        });

    
        // Check if there are any errors in numbers
        let balanceCheck = 0;
        Object.values(balance).forEach((bal) => {
            balanceCheck += parseFloat(parseFloat(bal).toFixed(3))
        });
    
    
        if(parseFloat(parseFloat(balanceCheck).toFixed(2)) != 0){
            console.log(balance);
            throw 'valueException';
        }
    
    
        
        // Round everything off to 2 dp
        Object.keys(balance).forEach((name) => {
            if(balance[name] == 0){
                delete balance[name];
            }
        })
    
        // Settle Bill Here
        const transactions = []; // format for each trans is [payer, payee, amount]
        while(Object.keys(balance).length >0){

            const max = Math.max(...Object.values(balance));
            const maxName = Object.keys(balance)[Object.values(balance).indexOf(max)];
            const min = Math.min(...Object.values(balance));
            const minName = Object.keys(balance)[Object.values(balance).indexOf(min)];
    
            const amount = Math.min(max, -1 * min);
            const transaction = [minName, maxName, amount];
            transactions.push(transaction);
    
            balance[maxName] = balance[maxName] - amount;
            balance[minName] = balance[minName] + amount;
            // // Round everything off to 2 dp
            Object.keys(balance).forEach((name) => {
                if(parseFloat(balance[name]).toFixed(2) == 0){
                    delete balance[name];
                }
            })
        }
    
        // Create message
        let message = `Pay up pay up: \n\n`;
        transactions.forEach((transaction) => {
            message = message + `${transaction[0]} pay ${transaction[1]} $${parseFloat(transaction[2]).toFixed(2)} \n`
        });
    
    
        bot.sendMessage(
            chatId,
            message
        );
    }
    catch (e){
        if(e == 'membersNotSpecifiedException'){
            bot.sendSticker(chatId, "CAACAgUAAxkBAAEEXTtfzeP9jA-MCVqhJSMN30_GgeEHNgACBBMAArCYGwFamsSQnFGeNh4E");
                    bot.sendMessage(
                        chatId,
                       ' Oi please specify your members if you wanna use the \'all\' keyword\n'
                    );
                    return;
        }
        else if(e == 'valueException'){
            bot.sendSticker(chatId, "CAACAgUAAxkBAAEEXS1fzdk3vqjQJrbQgYUnw_-UH66xVwACHxMAArCYGwHXfYlkKE-7YB4E");
            bot.sendMessage(
                chatId,
                `Aiyo... numbers don’t add up leh... pls try again\n`
            );
            return;
        }
        else if(e == 'No Dash Error'){
            bot.sendSticker(chatId, "CAACAgUAAxkBAAEEXS1fzdk3vqjQJrbQgYUnw_-UH66xVwACHxMAArCYGwHXfYlkKE-7YB4E");
            bot.sendMessage(
                chatId,
                `Please Add a dash in between the payee name and number\n`
            );
            return;
        }
        else{
            bot.sendSticker(chatId, "CAACAgUAAxkBAAEEXSZfzcuQV4dkjritVTqJGMNUjkqf1QACChMAArCYGwH6XD8xf5BIgR4E");
            bot.sendMessage(
                chatId,
                `Got something wrong with ur format... /help to see the correct formatting\n`
            );
        }
    }
   
})


