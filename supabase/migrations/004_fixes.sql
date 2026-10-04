-- AfterBloom schema, part 4: small fixes found while testing. Safe to run more than once. Run AFTER 001, 002 and 003.

-- A mother can see the name of her circle's mentor (a "Bloom Buddy" is a public-facing role, like a professional).
drop policy if exists profiles_mentors on profiles;
create policy profiles_mentors on profiles for select to authenticated using (role = 'moderator');

notify pgrst, 'reload schema';
