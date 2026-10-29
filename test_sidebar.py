with open("src/components/ASVSWorkspace.tsx", "r") as f:
    content = f.read()

# Instead of `absolute xl:static inset-y-0 left-0`, let's just make it `fixed` for mobile overlay?
# If it's a mobile drawer, `fixed inset-y-0 left-0` is fine, BUT we need to push it past the layout sidebar, OR make it `z-50` so it goes OVER the Layout sidebar.
# If we make it `fixed inset-y-0 left-0 z-50`, it will act like a proper mobile drawer, covering everything on the left.
# Let's change `absolute xl:static inset-y-0 left-0 z-30` to `fixed xl:static inset-y-0 left-0 z-50`.
content = content.replace("absolute xl:static inset-y-0 left-0 z-30", "fixed xl:static inset-y-0 left-0 z-50")

with open("src/components/ASVSWorkspace.tsx", "w") as f:
    f.write(content)
