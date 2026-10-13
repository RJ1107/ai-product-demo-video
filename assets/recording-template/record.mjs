import {recordDemo} from './capture.mjs';

await recordDemo(async ({page,scene,pointer})=>{
  await scene('overview',async()=>{
    // Replace with real, verified actions and assertions for this application.
    // pointer.click and pointer.move glide a visible pointer to the target, so viewers can follow the action.
    // Example: await pointer.click(page.getByRole('button',{name:'Save',exact:true}));
    //          await page.getByText('Saved successfully',{exact:true}).waitFor();
    throw new Error('Inspect the actual application and implement this recording scene before running.');
  });
});
