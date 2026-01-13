-- Check for duplicate trips
SELECT 
    user_email,
    departure_location,
    destination,
    departure_date,
    COUNT(*) as duplicates
FROM trips
GROUP BY user_email, departure_location, destination, departure_date
HAVING COUNT(*) > 1;

-- Check total unique vs total trips
SELECT 
    COUNT(*) as total_trips,
    COUNT(DISTINCT CONCAT(user_email, departure_location, destination, departure_date)) as unique_trips
FROM trips;
