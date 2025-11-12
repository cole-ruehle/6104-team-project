# Problem Framing

## Domain

A digital meal ordering system that enables students to submit menu or custom food requests directly to chefs, who can view and manage incoming orders in real time.[^1]

[^1]: I think this app is like Uber Eats but without delivery people and reduce the dining hall physical clog. Also solves issue where the user only has like 10 mins but want a custom omlette in like 12 pm on weekday in Vassar, where the wait is like 30 mins.

## Problem

Many dinging solutions for students involve allowing students to order specific custom meal versions. Things like ordering an omlet, stir fry or a burger are often done through long queues where the chef ust remember what each has ordered and cook them while student have to wait in long lines for their food. A solution to this would be to allow for requests to be put in early and worked on so that they are prepared for when people arrive.

## Evidence

Our chef, who is on a lunch contract with us, prepares around 50 meals each day, including one daily special and six staple menu items. One major challenge is that students who cannot attend lunch in person currently have to place their orders through Google Sheets, which only allows for food pickup at the end of lunch. Meanwhile, students who are in a hurry often have to ask friends to notify the chef to start preparing their orders early. The chef has specifically requested a system like ours to streamline this process. Additionally, other students use gear grilling, a similar service, but it only allows for preparation at the end since it is not a live system. Finally, some students have reported waiting in long lines at locations like Simmons and Baker just to get standard meals.

## Comparables

1. **[CBORD/GET App](https://get.cbord.com/mit/full/prelogin.php)** - Students can use the GET app to check their meal funds (number of meal swipes, TechCash balance, etc.). It also allows online ordering for a few restaurants and cafes around campus, such as BibimBox and Carolicious in the Stud.  
   _Limitation:_ Online ordering is available only for a small selection of campus dining locations and does not include dining halls.

2. **[Dunkin’ Mobile App](https://www.dunkindonuts.com/en/mobile-app)** - Dunkin’s mobile app allows users to order ahead of time and pick up their food when it’s ready. This benefits students with tight schedules who want to grab food before or after class.  
   _Limitation:_ This app works well for Dunkin', but we do not have the same order online option for dining halls or other dining locations on campus.

3. **General Online Ordering Systems (e.g., restaurants, grocery apps, and retail stores)** - Many stores and restaurants now use online ordering systems to reduce waiting times. Examples include apps like Starbucks, Chipotle, and others. These systems allow users to place orders online and pick them up when its ready, improving efficiency.  
   _Limitation:_ These systems are not designed for campus dining hall environments that operate on meal plans.

## Features

The kitchen need to upload their ingredients available for today and it can be out of stock during the process. The status and availability of the ingredients for custom made meals must be visible for the students and categorized to which meal each ingredient can make up.

1. Menu Upload: Kitchen staffs can upload the name and stock status of each ingredient for each meal. Open to the public.

2. Advance Order Placement: Student place orders with custom ingredients for certain meal to the kitchen without having to enter the dining hall. Order is only visible to the designated kitchen.

3. Policy Timer: Students have to pickup within certain time an order is finished because there's no enough room to store plates with finished food as well as preventing students from hogging the kitchen and never coming down. Prevent food waste, quality of food (when it gets cold), and bad usuage of the application from users.

4. Swipe System Payment: Students will have to be eligible to enter the dining hall if they place an advance order, thus students would have to 'swipe' online before they can place order. By swiping, it means the same payment system as of the physical dining hall right now, where it accepts card or meal plans. This is the feature for checking a user's eligiblity if they can order.

5. User system: Users can register with MIT kerb or continue as guest user. MIT kerb linked users can connect their meal plan system. Guest users can link their cards.

6. PickUp Confirmation: Each user can place how much and where they want their meal from, but has to be picked up in time. When they go to the certain kitchen/dining hall to pickup, since they already swiped online when they walk in the right dining hall, swiping again doesn't take off one meal but works as a confirmation for their order. Only confirm if within the given time for the user to pickup.

## Ethical Analysis

1. **Stakeholders (Direct Stakeholders)**  
   a. Although the app aims to help speed up the ordering and dining process for students, chefs and dining hall staff are also affected, since the app will change their workflow. On top of the in-person orders that they are handling, the staff may feel rushed or overwhelmed during peak ordering spikes with the online orders.  
   b. To combat an overflowing number of orders, we can implement a feature that watches out for peak ordering times. The app can limit orders when it gets too busy for the staff.

2. **Stakeholders (Non-Targeted Use)**  
   a. Students might use the app to place repeated orders or orders they do not intend to pick up to bother staff, which wastes food and time. This is a risk of non-targeted or malicious use.  
   b. We can add student ID verification and a cancellation/penalty policy for uncollected orders to discourage misuse.

3. **Pervasiveness (Widespread Use)**  
   a. If the app becomes widespread, peak dining hall hours may shift or become even busier, creating worse waiting times rather than improving them. Some students who are not using the app could end up waiting longer than before.  
   b. The app can introduce a time slot scheduling system or a designated queue for walk in customers to maintain fairness between app users and non-users.

4. **Time (Adaptation)**  
   a. Some students might have tight schedules that only give them small gaps of time for meals and breaks. The app can help these students adapt by making it easier to pick up meals quickly between classes. This could support healthier eating habits because they no longer skip meals due to the lack of time and long lines.  
   b. The app can have features where it estimates pickup windows to let students know how long before their orders are ready. We can also have a feature that allows students to place/schedule orders in advance so they do not have to worry about placing it the day of. This would allow them to plan according to their class schedules more seamlessly.

5. **Time (Reappropriation)**  
   a. Student groups might use the app to place bulk orders and unintentionally clogging the system, delaying individual meals.  
   b. The app can include a separate system for large group orders so that normal meal service remains unaffected.

6. **Values (Chosen Desired Value: Privacy)**  
   a. Tracking a student’s order history might unintentionally reveal a student's schedule, such as where they spend time or when they are on campus. This can affect privacy.  
   b. The app can either not track a student’s order history or allow them to delete it.
