# cd Documents/projects/cisco site/front-end/front end/

a = "Chemistry HL, Physics HL, Mathematics AA HL, Spanish Ab HL, Language and Literature SL, Economics SL"
a = a.split(', ')
for x in a:
    print(f'<a href="class.html"><li class="truncate">{x}</li></a>')

n = 1
for i in a:
    print(f'<option value="{n}">{i}</option>')
    n += 1
