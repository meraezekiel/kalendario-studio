# example folder structure

/ReflectionForm
 - /implementation
   - RelectionForm.tsx [make sure we only 1 component function in here]
   - useRelectionFormHandler.ts -> main handler
   - /handler [if main handler has a lot of code we need to organize it in here]
     - useFunction1Handler.ts
     - useFunction2Handler.ts
   - /NestedReplies [create a separate component and use it in the RelectionForm.ts or what ever is needed]
     - /implementation
        - NestedReplies.tsx
        - useNestedRepliesHandler.ts
        - /handler [if main handler has a lot of code we need to organize it in here]
            - useFunction1Handler.ts
            - useFunction2Handler.ts

and so on..