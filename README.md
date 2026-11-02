# AI Club Portal: setup (about 15 minutes, free)

Built with plain HTML/CSS plus a little JavaScript, and **Supabase** (free database, login and file storage). Hosting: **GitHub Pages**.
HTML/CSS alone cannot do logins, a database or uploads, so a small amount of JavaScript is unavoidable. Every file is commented.

## 1. Create the database
1. Sign up at supabase.com, click **New project**, choose a region close to India, and save the database password.
2. Open **SQL Editor > New query**, paste all of `setup.sql`, click **Run**.

## 2. Connect the website
1. In Supabase open **Project Settings > API**.
2. Copy the **Project URL** and the **anon public** key into `config.js`. (Never use the `service_role` key.)

## 3. Create the trainer login
1. **Authentication > Users > Add user**: enter the trainer's email and a strong password, tick *Auto confirm*.
2. In **SQL Editor** run (use the same email):
   `insert into trainers (user_id) select id from auth.users where email = 'trainer@example.org';`
3. **Authentication > Providers > Email**: turn **off** "Allow new users to sign up". Only people you add can log in.
   (Even without this, strangers cannot edit anything: the database only accepts changes from accounts listed in `trainers`.)

## 4. Publish on GitHub Pages
1. Create a GitHub repository and upload all files in this folder.
2. **Settings > Pages > Deploy from branch > main / root**. Your site appears at `https://<username>.github.io/<repo>/`.
3. Visit `/admin.html` on that address and sign in. (There is also a small "Trainer login" link in the footer.)

## Using it
- **Add, Edit, Delete** work for every section. Photos and documents are uploaded to Supabase storage (max 10 MB each).
- Gallery: choose several photos at once to add many.
- Home page numbers update by themselves. Sample content can be edited or deleted.
- Website Settings controls the about text, organisation names and contact details.

## Good to know
- Free Supabase projects can pause after a period of no activity. If the site stops loading, open the project and click **Restore**.
- To add a second trainer, create another user and run the `insert into trainers` line for their email.
