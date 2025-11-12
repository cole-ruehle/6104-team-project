# Problem Framing
## Domain
A digital meal ordering system that enables students to submit menu or custom food requests directly to chefs, who can view and manage incoming orders in real time.[^1]


[^1]:I think this app is like Uber Eats but without delivery people and reduce the dining hall physical clog. Also solves issue where the user only has like 10 mins but want a custom omlette in like 12 pm on weekday in Vassar, where the wait is like 30 mins.

## Problem
Many dinging solutions for students involve allowing students to order specific custom meal versions. Things like ordering an omlet, stir fry or a burger are often done through long queues where the chef ust remember what each has ordered and cook them while student have to wait in long lines for their food. A solution to this would be to allow for requests to be put in early and worked on so that they are prepared for when people arrive.

## Evidence

Our chef, who is on a lunch contract with us, prepares around 50 meals each day, including one daily special and six staple menu items. One major challenge is that students who cannot attend lunch in person currently have to place their orders through Google Sheets, which only allows for food pickup at the end of lunch. Meanwhile, students who are in a hurry often have to ask friends to notify the chef to start preparing their orders early. The chef has specifically requested a system like ours to streamline this process. Additionally, other students use gear grilling, a similar service, but it only allows for preparation at the end since it is not a live system. Finally, some students have reported waiting in long lines at locations like Simmons and Baker just to get standard meals.

## Features

The kitchen need to upload their ingredients available for today and it can be out of stock during the process. The status and availability of the ingredients for custom made meals must be visible for the students and categorized to which meal each ingredient can make up.
1. Menu Upload: Kitchen staffs can upload the name and stock status of each ingredient for each meal. Open to the public.

2. Advance Order Placement: Student place orders with custom ingredients for certain meal to the kitchen without having to enter the dining hall. Order is only visible to the designated kitchen.

3. Policy Timer: Students have to pickup within certain time an order is finished because there's no enough room to store plates with finished food as well as preventing students from hogging the kitchen and never coming down. Prevent food waste, quality of food (when it gets cold), and bad usuage of the application from users.

4. Swipe System Payment: Students will have to be eligible to enter the dining hall if they place an advance order, thus students would have to 'swipe' online before they can place order. By swiping, it means the same payment system as of the physical dining hall right now, where it accepts card or meal plans. This is the feature for checking a user's eligiblity if they can order.

5. User system: Users can register with MIT kerb or continue as guest user. MIT kerb linked users can connect their meal plan system. Guest users can link their cards.

6. PickUp Confirmation: Each user can place how much and where they want their meal from, but has to be picked up in time. When they go to the certain kitchen/dining hall to pickup, since they already swiped online when they walk in the right dining hall, swiping again doesn't take off one meal but works as a confirmation for their order. Only confirm if within the given time for the user to pickup.
