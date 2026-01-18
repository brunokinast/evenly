# Run Evenly app with persistent Chrome profile
# This keeps your Firebase auth between runs

flutter run -d chrome --web-port=8080 --web-browser-flag="--user-data-dir=$env:USERPROFILE\Desktop\evenly\chrome-profile"
