`http://localhost:3000/admin`
->
```
## Error Type
Runtime TypeError

## Error Message
Cannot destructure property 'profile' of '(0 , _components_auth_AuthWrapper__WEBPACK_IMPORTED_MODULE_4__.useAuth)(...)' as it is undefined.


    at AdminDashboardPage (app/admin/page.tsx:11:11)

## Code Frame
   9 |
  10 | export default function AdminDashboardPage() {
> 11 |   const { profile } = useAuth();
     |           ^
  12 |   const [stats, setStats] = useState({
  13 |     totalUsers: 0,
  14 |     totalSlots: 0,

Next.js version: 15.5.2 (Webpack)
```

`http://localhost:3000/dashboard`
->
```
## Error Type
Console Error

## Error Message
Profile fetch error: {}


    at AuthWrapper.useEffect.fetchProfile (components/auth/AuthWrapper.tsx:99:21)

## Code Frame
   97 |
   98 |           if (error) {
>  99 |             console.error("Profile fetch error:", error);
      |                     ^
  100 |             // If profile doesn't exist, redirect to profile setup
  101 |             if (error.code === 'PGRST116') {
  102 |               console.log("Profile not found, consider redirecting to profile setup");

Next.js version: 15.5.2 (Webpack)
```

`http://localhost:3000/bookings`
->
```
## Error Type
Console Error

## Error Message
Profile fetch error: {}


    at AuthWrapper.useEffect.fetchProfile (components/auth/AuthWrapper.tsx:99:21)

## Code Frame
   97 |
   98 |           if (error) {
>  99 |             console.error("Profile fetch error:", error);
      |                     ^
  100 |             // If profile doesn't exist, redirect to profile setup
  101 |             if (error.code === 'PGRST116') {
  102 |               console.log("Profile not found, consider redirecting to profile setup");

Next.js version: 15.5.2 (Webpack)
```

`http://localhost:3000/bookings/new`
->
```
## Error Type
Runtime TypeError

## Error Message
Cannot destructure property 'profile' of '(0 , _components_auth_AuthWrapper__WEBPACK_IMPORTED_MODULE_2__.useAuth)(...)' as it is undefined.


    at Navigation (components/common/Navigation.tsx:10:11)
    at NewBookingPage (app/bookings/new/page.tsx:7:7)

## Code Frame
   8 |
   9 | export default function Navigation() {
> 10 |   const { profile } = useAuth();
     |           ^
  11 |   const [menuOpen, setMenuOpen] = useState(false);
  12 |
  13 |   const handleSignOut = async () => {

Next.js version: 15.5.2 (Webpack)
```

is there a need to reconcile `add_slot_ownership.sql` with `schema.sql` for a new version of `schema.sql`? also, could that be an issue? after resolving that, check if we have a reset password functionaiity as well as admin functions to modify profiles

`http://localhost:3000/fix-profile` -> 
```
Error: duplicate key value violates unique constraint "user_profiles_pkey"
```