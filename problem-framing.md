# Problem Framing

## Domain

A digital meal ordering system that enables students to submit menu or custom food requests directly to chefs, who can view and manage incoming orders in real time.[^1]

[^1]: I think this app is like Uber Eats but without delivery people and reduce the dining hall physical clog. Also solves issue where the user only has like 10 mins but want a custom omlette in like 12 pm on weekday in Vassar, where the wait is like 30 mins.

## Problem

Many dining solutions for students allow them to order specific custom meal options. Ordering items such as omelets, stir-fries, or burgers often requires standing in long lines, where the chef must remember each person's request and cook them while students wait. This results in long wait times for food. A potential solution is to allow requests to be submitted in advance, so that meals can be prepared ahead of time and ready when people arrive.

## Evidence

Our chef, who is on a lunch contract with us, prepares around 50 meals each day, including one daily special and six staple menu items. One major challenge is that students who cannot attend lunch in person currently have to place their orders through Google Sheets, which only allows for food pickup at the end of lunch. Meanwhile, students who are in a hurry often have to ask friends to notify the chef to start preparing their orders early. The chef has specifically requested a system like ours to streamline this process. Additionally, other students use gear grilling, a similar service, but it only allows for preparation at the end since it is not a live system. Finally, some students have reported waiting in long lines at locations like Simmons and Baker just to get standard meals.

This issue is also prevalent at other institutions; a common theme is that the waiting and, specifically, the ordering process makes dining halls less efficient than eating out, while often being more expensive than cooking for oneself.

-   https://www.reddit.com/r/USC/comments/1fip4w5/waiting_time_at_dining_hall/
-   https://nyunews.com/opinion/2023/03/10/awful-wait-times-nyu-eats/
-   https://www.browndailyherald.com/article/2021/09/long-lines-brown-dining
-   https://pittnews.com/article/197117/news/on-campus-dining-wait-times-frustrate-students-as-pitts-population-expands/
-   https://lafayettestudentnews.com/135811/news/fixing-long-food-lines-proves-difficult/
-   https://www.dailyprincetonian.com/article/2025/10/princeton-news-stlife-reduce-hours-frist-late-meal-overcrowding-in-dining-halls-student-reactions

In fact, one employee specifically pointed out that the largest factor causing delays at UCSD dining halls is in-person orders.

-   https://www.reddit.com/r/UCSD/comments/1o3o6fm/comment/niwkffj/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button

## Comparables

1. **[CBORD/GET App](https://get.cbord.com/mit/full/prelogin.php)** - Students can use the GET app to check their meal funds (number of meal swipes, TechCash balance, etc.). It also allows online ordering for a few restaurants and cafes around campus, such as BibimBox and Carolicious in the Stud.

    _Limitation:_ Online ordering is available only for a small selection of campus dining locations and does not include dining halls.

2. **[Dunkin’ Mobile App](https://www.dunkindonuts.com/en/mobile-app)** - Dunkin’s mobile app allows users to order ahead of time and pick up their food when it’s ready. This benefits students with tight schedules who want to grab food before or after class.

    _Limitation:_ This app works well for Dunkin', but we do not have the same order online option for dining halls or other dining locations on campus.

3. **General Online Ordering Systems (e.g., restaurants, grocery apps, and retail stores)** - Many stores and restaurants now use online ordering systems to reduce waiting times. Examples include apps like Starbucks, Chipotle, and others. These systems allow users to place orders online and pick them up when its ready, improving efficiency.

    _Limitation:_ These systems are not designed for campus dining hall environments that operate on meal plans.

4. **[Transact Mobile Order](https://www.transactcampus.com/solutions/campus-commerce/transact-mobile-ordering)** - A mobile ordering app built for college campuses that enables students to order ahead, pay with campus cards/meal plans, and pick up food at dining locations.

    _Limitation_: Though designed for campus dining, this system may focus more on standard grab-and-go menu items rather than customized meal items, so it may not integrate well with some aspects of our dining halls.

5. **Google Sheets** — As mentioned above, a workaround to this problem is to rely on Google Sheets for students to place orders in advance. Students manually enter their meal choices, which the chef reviews later to prepare food for pickup at the end of lunch.

    _Limitation:_ This method does not allow students to schedule or receive live updates about their orders. It also increases the chance of human error.

## Features

The kitchen needs to upload the ingredients available for the day, with stock updates reflected in real time. Ingredient availability must be visible to students, categorized by the meals they can be used for. Orders update dynamically as ingredients run out, and all ordering, timing, and pickup are tied to existing MIT dining and payment systems.

### 1. Menu & Ingredient Management

-   Kitchen staff can upload daily menu items, their customizable ingredients, and stock quantities.
-   Food availability updates in real time as orders are placed or ingredients run out.
-   Meals and ingredients can be tagged (e.g., vegetarian, gluten-free, contains nuts) for accessibility and dietary filtering.
-   Each menu item has a prep time.

### 2. Custom Meal Builder

-   Students can customize meals (e.g., omelets, stir-fries, salads) by selecting available ingredients and other preferences.
-   Each customization option dynamically reflects what’s currently available in the kitchen.
-   List of pre-built recommended combos are available to speed up ordering for popular or chef-recommended configurations.

### 3. Advance Order Placement

-   Students can submit orders to a specific kitchen before arriving, with options to schedule for a pickup time window.
-   Each order is visible only to the designated kitchen and linked to that day’s menu.
-   Order cutoff times can be set by the kitchen to avoid late or unmanageable submissions.

### 4. Order Queue Management (Kitchen Dashboard)

-   Kitchen staff can view incoming orders in real time, sorted by pickup deadline.
-   Staff can mark orders as “In Progress,” “Ready for Pickup,” or “Completed,” which updates student notifications instantly.

### 5. Policy Timer & Pickup Enforcement

-   A timer enforces a pickup window after food is ready (e.g., 15–20 minutes).
-   Orders not picked up in time are marked as expired and optionally penalized to discourage misuse.
-   Real-time notifications alert users when their order is nearly ready and again when it’s ready for pickup. Also shows user the estimated prep time when their order is initially placed.
-   Helps maintain food quality and prevents storage overflow at the kitchen.

### 6. User System

-   Users can sign in with MIT Kerberos credentials or as guests.
-   MIT users can connect to their existing meal plan or TechCash.
-   Guest users can link debit/credit cards for payment.

### 7. Payment & Swipe System Integration

-   Students “swipe” digitally (via MIT ID) before placing an order to confirm payment eligibility.
-   Once swiped, their account is flagged as having used a meal for that dining period.
-   When they physically swipe again upon entering the dining hall, it serves as confirmation for pickup without charging a second time.
-   If order was placed as a guest, they can simply show confirmation page to enter the dining hall.

### 8. Real-Time Notifications

-   Students receive updates when:
    -   Their order is accepted with estimated time until ready based on the specific order and how busy the dining hall is currently.
    -   The kitchen begins preparation.
    -   The order is nearly ready (e.g., 3–5 minutes remaining).
    -   The order is ready for pickup.
-   Notifications can be through push alerts, email, SMS, or user's choice.

## Ethical Analysis

1. **Stakeholders (Direct Stakeholders)**

    - a. Although the app aims to help speed up the ordering and dining process for students, chefs and dining hall staff are also affected, since the app will change their workflow. On top of the in-person orders that they are handling, the staff may feel rushed or overwhelmed during peak ordering spikes with the online orders.
    - b. To combat an overflowing number of orders, we can implement a feature that watches out for peak ordering times. The app can limit orders when it gets too busy for the staff.

2. **Stakeholders (Non-Targeted Use)**

    - a. Students might use the app to place repeated orders or orders they do not intend to pick up to bother staff, which wastes food and time. This is a risk of non-targeted or malicious use.
    - b. We can add student ID verification and a cancellation/penalty policy for uncollected orders to discourage misuse.

3. **Pervasiveness (Widespread Use)**

    - a. If the app becomes widespread, peak dining hall hours may shift or become even busier, creating worse waiting times rather than improving them. Some students who are not using the app could end up waiting longer than before.
    - b. The app can introduce a time slot scheduling system or a designated queue for walk in customers to maintain fairness between app users and non-users.

4. **Time (Adaptation)**

    - a. Some students might have tight schedules that only give them small gaps of time for meals and breaks. The app can help these students adapt by making it easier to pick up meals quickly between classes. This could support healthier eating habits because they no longer skip meals due to the lack of time and long lines.
    - b. The app can have features where it estimates pickup windows to let students know how long before their orders are ready. We can also have a feature that allows students to place/schedule orders in advance so they do not have to worry about placing it the day of. This would allow them to plan according to their class schedules more seamlessly.

5. **Time (Reappropriation)**

    - a. Student groups might use the app to place bulk orders and unintentionally clogging the system, delaying individual meals.
    - b. The app can include a separate system for large group orders so that normal meal service remains unaffected.

6. **Values (Chosen Desired Value: Privacy)**
    - a. Tracking a student’s order history might unintentionally reveal a student's schedule, such as where they spend time or when they are on campus. This can affect privacy.
    - b. The app can either not track a student’s order history or allow them to delete it.
