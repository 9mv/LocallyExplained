I want to create a web application which will be oriented to city or location visitors to have explanations on given sites or pinpointed locations. The main interface will be an interactive map in which the user can move and navigate. This map will have pins on given locations, which will be called "Storypoints". 

When a user selects a storypoint, a mini pop up will open with a title of the pintpoint (this title will be a location name, story, significative title for the point of interest) and a button saying "Play" and an "X" button on the top right corner to close the pop up. 

If the user has interest in playing that story or information on the point of interest selected it will press the "Play" button, which will open the full storypoint content with the title on top and the text with whatever information or story has been assigned to that pinpoint along with text size control, text-to-speech control and a button to close.

The website must have a home landing page. This landing page should ask for a location in case it is the first visit and it will consist of the interactive map itself. The default location will be Menorca. If the user accepted location services it will be moved to its position with a range of 3 km.

The website must have a button near the map that says "Request a storypoint" to request a story to be added. Pressing this button will indicate the user to select an exact point on the map to add the location of the new storypoint. If the user wants to cancel the request, it can press the "Request a storypoint" button again. If the user selects the location, it will ask for a title, the text of the story and an email.

The website must have a donations page. In a future, I will setup a widget or link to pay via paypal. Leave a placeholder or propose a solution to accept donations.

The website must have a who are we page, leave a placeholder text.

There will be an admin page which will be accessed by password. There, the admin will be able to accept or discard storypoint requests. When a storypoint is accepted or rejected, a confirmation mail will be sent to the requestor mail indicating whether it has been enabled or disabled.

Plan all the technologies, architecture of the website and propose an implementation plan to implement it. Ask yourself these questions: 
- which framework or technology will the interactive map be built with? 
- How will be the pinpoints added, removed and maintained? (database, technologies, authentication to add or remove them, etc.)
- How will be the webpage implemented? Which frameworks and technologies?
- Which text to speech technology will be used? 
- how will the admin user and other uses databases implemented?
- Which security mechanisms will you implement to make the website secure?
- How can I host the website?

Guidelines on the design of the webpage:
- In order for the admin to login, there will be a login button in the top right of the page.
- The page for a storypoint must be plain text with the text of the story, two buttons to make the text bigger and smaller respectively, a button to play and pause the text-to-speech to listen to the text (it will be a button that toggles icon between play and pause) and a button to close the story and return to the map.
- The website must be available in multiple languages. The default will be catalan, but it must support spanish and english too. Implement a localization architecture in order to maintain easily translations in the webpage and use automatic translation from the original language in the storypoint texts. 
- The webpage must have the pages mentioned in the explanation above.