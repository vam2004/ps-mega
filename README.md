# Introduction
This repository contains the project developed in group for the Mega's selective process. Despiste of its simplicity, it is a one month hard work. 
It wasn't inteded to be a complete, functional and robust application, instead focus on demostrating, avaliating and imploving the skills. 
Some files are reusable pieces of code, these are the following libraries:

  `backend/private_routers.js` - inject into express the acess permission system (which uses a singleton patern to reuse the same router)
  
  `backend/sessions.js` - the session managment (create, sign, validadate and inject the session data of each request)
  
  `backend/auth.js` - the database managment (manages the request, acepption or rejection of register; remove and authenticate a registred user)
 
 # Known issues
  - The database operation are slow and sometimes not atomic
  - The main application allows a priviligie scalation of a registred user, because doesn't validate the groupname
  - The database doesn't keep track o group of user, because this the feature was lost in a older version, even it was buggy and unstable.
  - The error's messages are not user friendly, and could leak some data from backend
  - The frontend sometimes doesn't show userful message
  - The user interface is not multilanguage
  - Incomplete project
 
# Start the servers
To start the frontend, go to `frontend` and then run:

  vue serve
  
 The frontend will expect that the backend was running at adress `127.0.0.1:9001`. Therefore, you should make sure to start the backend 
 before interacting with the frontend. This can be done by opening a terminal at folder `backend` and running:
 
 node index.js
 
# Command line managment
