@echo off
REM Rename Telecom screenshot images to proper names
REM Run this script from the assets folder

cd /d "%~dp0"

echo Renaming Telecom screenshot images...

ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-49a3f456-0712-4a44-8e51-04501d82de19.png" "telecom-account-required.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-ae8bbdb4-a11f-409d-9f46-41347b481f0c.png" "telecom-create-account-form.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-dd5828e5-481b-432e-b276-b2c27cf5d2a3.png" "telecom-welcome-screen.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-2e7798e8-23a7-4fb5-84ba-3edad903f497.png" "telecom-settings.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-46e216d1-943e-4ce9-86d1-7b525ec9735a.png" "telecom-main-interface.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-27411223-0f8e-49ab-8f6c-5ff0702b0ee1.png" "telecom-invite-received.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-5679e812-783f-4074-b2d0-125f6fff45ac.png" "telecom-password-dialog.png"
ren "c__Users_olegk_AppData_Roaming_Cursor_User_workspaceStorage_480c243cc830677fcc1ac51e3bc30754_images_image-dca1ab35-9b3a-47d1-8315-ae9e795575d5.png" "telecom-ice-servers-config.png"

echo Done! All images renamed.
