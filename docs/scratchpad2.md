`http://localhost:3000/bookings/new` -> ```
 
1 of 1 unhandled error

Unhandled Runtime Error
Error: Event handlers cannot be passed to Client Component props.
  <... onSuccess={function}>
                 ^^^^^^^^^^
If you need interactivity, consider converting part of this to a Client Component.

Call Stack
<unknown>
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:280828)
Object.toJSON
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:281723)
stringify
<anonymous>
<unknown>
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:268079)
ez
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:268158)
eH
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:268559)
Timeout._onTimeout
/home/ltpt420/repos/parkboard/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js (35:265057)
listOnTimeout
node:internal/timers (588:17)
process.processTimers
node:internal/timers (523:7)```

`http://localhost:3000/admin/slots` ->
```
TypeError: Cannot destructure property 'profile' of '(0 , _components_auth_AuthWrapper__WEBPACK_IMPORTED_MODULE_3__.useAuth)(...)' as it is undefined.
```

`http://localhost:3000/admin/users` ->
```
TypeError: Cannot destructure property 'profile' of '(0 , _components_auth_AuthWrapper__WEBPACK_IMPORTED_MODULE_3__.useAuth)(...)' as it is undefined.
```

`http://localhost:3000/fix-profile` -> 
```
Error: duplicate key value violates unique constraint "user_profiles_pkey"
```