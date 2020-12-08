# splityobillsbot
Telegram bot which helps to split bills. It is a stateless telegram bot that helps to reduce the number of total transactions when there are many different transactions.

# Format
/splitbill-
[members]
<Transactions>

# Example Request
/splitbill-
members: alice, bob, charlie

alice, steak: 20 $ all 

bob, pizza: 10 $ charlie

charlie, chicken: 15 $ alice-5, bob-10



# Example Response
Pay up pay up: 

bob pay alice $6.67 
charlie pay alice $1.67



