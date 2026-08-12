GANESH 25TH ANNIVERSARY GALLERY — IPAD PWA

Included
- Timeline beginning September 2001 through 2026
- 2001 marked "Our Beginning • Sep 2001"
- 2026 marked "25th Anniversary"
- iPad Home Screen app metadata and icon
- Full-screen standalone mode when launched from Home Screen
- Offline app shell via service worker after first HTTPS load
- Touch-friendly year/photo grids
- Full-screen viewer and swipe navigation
- Manual slideshow
- Automatic all-years slideshow after 45 seconds of inactivity
- Photo folders for 2001–2026
- Automatic media indexing from the year folders

Add photos
1. Copy images into photos/YYYY/.
2. Keep videos in the same year folder.
3. Start the site with start_server_mac.command or start_server_windows.bat.
4. The gallery list is rebuilt automatically from the folder contents.
5. Then publish the whole folder to an HTTPS static site and follow INSTALL_ON_IPAD.txt.

CREATE A SMALLER WEB PUBLISH COPY
---------------------------------
If you want a lighter version for hosting without changing your originals:
1. Keep your full-quality files in photos/YYYY/.
2. Run build_publish_copy.command.
3. A web-optimized copy is created in dist/.
4. The dist/ folder uses smaller JPEG versions for hosting.
5. Your original files in photos/ are not changed.

GITHUB PAGES
------------
If you want to host this for free on GitHub Pages:
1. Run build_github_pages.command.
2. This creates a ready-to-publish docs/ folder from the smaller web copy.
3. Push the project to a GitHub repository.
4. In GitHub, enable Pages from the main branch and the /docs folder.
5. GitHub will publish the site from docs/.


VIDEO SUPPORT
-------------
The gallery supports photos and videos in the same year folder. For iPad, use MP4 files encoded with H.264 video (AAC audio recommended).
Videos display with a play badge and open with native playback controls. Automatic slideshows use photos only.
