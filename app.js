const express = require('express');
const fs = require('fs');
const path =  require('path');
const db = require('./data/database');
const mongodbStore = require('connect-mongodb-session');
const session = require('express-session');
const bcryptjs = require('bcryptjs');
app = express();

const MongoDBStore = mongodbStore(session);
const sessionStore = new MongoDBStore({
  uri: 'mongodb://127.0.0.1:27017',
  databaseName: 'exam-management-portal',
  collection: 'sessions'
});

//middleware functions
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.urlencoded({extended:false}));
app.use(express.static('public'))
app.use(session({
  secret: 'prathish',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}))


//functions

async function saveHallDetails(details){
  let i=1;
  const hallDetails = [];
  while(details['roomNo'+i]){
    let o={}
    o['roomNo']=details['roomNo'+i];
    o['deptName'] =details['deptName'+i];
    o['totalSeats']=details['totalSeats'+i];
    hallDetails.push(o);
    i++;
  }

    await db.getDb().collection('hallDetails').drop();
    await db.getDb().createCollection('hallDetails');

  if(hallDetails.length>0){
    const insertFlag =await db.getDb().collection('hallDetails').insertMany(hallDetails);
    console.log(insertFlag);
  }
  else console.log('No hall details is inserted');
}

async function saveStudentDetails(details){
  let i=1;
  const studentDetails = [];
  while(details['enrollmentId'+i]){
    let o={}
    o['enrollmentId']=details['enrollmentId'+i];
    o['name'] =details['name'+i];
    o['fatherName']=details['fatherName'+i];
    o['gender']=details['gender'+i];
    o['courseCode']=details['courseCode'+i];
    o['semester'] =details['semester'+i];
    o['dob']=details['dob'+i];
    o['address']=details['address'+i];
    studentDetails.push(o);
    i++;
  } 

  await db.getDb().collection('studentDetails').drop();
  await db.getDb().createCollection('studentDetails');

  if(studentDetails.length > 0) 
  {
    const insertFlag = await db.getDb().collection('studentDetails').insertMany(studentDetails);
    console.log(insertFlag);
  }
  else console.log('No student deletails inserted!');
  }

async function saveInvigilatorDetails(details){
  let i=1;
  const invigilatorDetails = [];
  while(details['staffId'+i]){
    let o={}
    o['staffId']=details['staffId'+i];
    o['name'] =details['iname'+i];
    o['password']=details['password'+i];
    invigilatorDetails.push(o);
    i++;
  }

  await db.getDb().collection('invigilatorDetails').drop();
  await db.getDb().createCollection('invigilatorDetails');
  
  if(invigilatorDetails.length>0){
  const insertFlag = await db.getDb().collection('invigilatorDetails').insertMany(invigilatorDetails);
  console.log(insertFlag)
  }
  else console.log('No invigilator details inserted!');
}
async function saveCourseDetails(details){
  let i=1;
  const courseDetails = [];
  while(details['scourseCode'+i]){
    let o={}
    o['courseCode']=details['scourseCode'+i];
    o['semester'] =details['ssemester'+i];
    o['subjectCode']=details['subjectCode'+i];
    o['examDate']=details['examDate'+i];
    courseDetails.push(o);
    i++;
  }
 await db.getDb().collection('courseDetails').drop();
 await db.getDb().createCollection('courseDetails');

  
  if(courseDetails.length>0){
    const insertFlag = await db.getDb().collection('courseDetails').insertMany(courseDetails);
    console.log(insertFlag);
  }
  else console.log('No course details inserted!');
}

//post methods
app.post('/getHallTicket',async function(req,res){
  const userEnrollmentId = req.body.registrationNumber;
  const userDob = req.body.date;
  const studentDetails = await db.getDb().collection('studentDetails').find().toArray();
  let flag=1;
  let student ={};
  for (const val of studentDetails){
    if(val.enrollmentId === userEnrollmentId && val.dob === userDob) {
      flag=0;
      student=val;
      break;
    }
  }
  if(flag===1){
    res.render('studentLogin',{flag:flag});
 }
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data','others.json')));
  if(!others.isPublished) flag=2;
  if(flag===0){
    const examDetails= await db.getDb().collection('publishedStudentDetails').find().toArray();
     res.render('hallTicketDetails',{student: student,exam: examDetails,id: userEnrollmentId});
  }
  else res.render('studentLogin',{flag:flag});

})

app.post('/proctor',async function(req,res){

  const invigilatorDetails =db.getDb().collection('invigilatorDetails').find().toArray();
  let flag=1;
  for (const val of invigilatorDetails){
    if(val.staffId === id && val.password === password) {
      flag=0;
      break;
    }
  }
  if(flag===1){
    res.render('login',{flag:flag});
  }
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data','others.json')));
  if(!others.isPublished) flag=2;
  if(flag===0){
    const publishedInvigilatorDetails = await db.getDb().collection('publishedInvigilatorDetails').find().toArray();
     res.render('invigilator',{exam: publishedInvigilatorDetails,id: id});
  }
  else res.render('login',{flag:flag});
  
})

app.post('/admin/student',async function(req,res){
const userId = req.body.id;
const password = req.body.password;
const student = await db.getDb().collection('studentDetails').find().toArray();
const adminarr = await db.getDb().collection('admin').find({userId: 'admin'}).toArray(); 
const admin = adminarr[0];
const passwordAreEqual = await bcryptjs.compare(password,admin.password);
if(userId===admin.userId && passwordAreEqual){
  req.session.userId = admin.userId;
  req.session.isLoggedIn =  true;
  res.status(200).render('studentDetails',{student: student}); 
}
else{
  res.redirect('/adminLogin');
}
})


app.post('/saveDetails/student', async function(req,res){
  req.session.isLoggedIn
  if(req.session.isLoggedIn){
  await saveStudentDetails(req.body);
  res.redirect('/admin/student');
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post('/saveDetails/invigilator',async function(req,res){
  req.session.isLoggedIn
  if(req.session.isLoggedIn){
 await saveInvigilatorDetails(req.body);
  res.redirect('/admin/invigilator');
}
else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post('/saveDetails/course',async function(req,res){
  req.session.isLoggedIn
  if(req.session.isLoggedIn){
  await saveCourseDetails(req.body);
  res.redirect('/admin/course');
}
else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post('/saveDetails/hall',async function(req,res){
  req.session.isLoggedIn
  if(req.session.isLoggedIn){
  await saveHallDetails(req.body);
  res.redirect('/admin/hall');
}
else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post('/logout',async function(req,res){
const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data','others.json')));
req.session.user = null;
req.session.isLoggedIn = false;
res.redirect('/adminLogin');
if(!others.isPublished){
  let type= req.body.type;
  if(type===1) await saveStudentDetails(req.body);
  else if(type===2) await saveInvigilatorDetails(req.body);
  else if(type===3) await saveCourseDetails(req.body);
  else if(type===4) await saveHallDetails(req.body);
}

})




//algorithm for shuffling students based on thier subject code
app.post("/publish",async function(req,res){
  req.session.isLoggedIn
  if(req.session.isLoggedIn){
  let type= req.body.type;
  if(type===1) await saveStudentDetails(req.body);
  else if(type===2) await saveInvigilatorDetails(req.body);
  else if(type===3) await saveCourseDetails(req.body);
  else if(type===4) await saveHallDetails(req.body);
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data',"others.json")));
  others.isPublished=true;
  fs.writeFileSync(path.join(__dirname,'data',"others.json"),JSON.stringify(others)); 
  res.redirect('/admin')

  //getting same dates for all subject courses
  const course = await db.getDb().collection('courseDetails').find().toArray();
  const hall = await db.getDb().collection('hallDetails').find().toArray();
  const student =await db.getDb().collection('studentDetails').find().toArray();
  const invigilator =await db.getDb().collection('invigilatorDetails').find().toArray();
  
  let dtcc={}
  for(val of course){
    if(!dtcc[val.examDate]){
      dtcc[val.examDate]=[];
    }
    dtcc[val.examDate].push(val);
  }
// console.log(dtcc)
  buffTotal=[];
  buffTotal2=[];
  for(date in dtcc ){
   let buff=[]
   console.log(date);
    for(val of dtcc[date]){
      for(s of student ){
        if(s.courseCode === val.courseCode && s.semester === val.semester) 
        {
          s.subjectCode = val.subjectCode;
          s.examDate = val.examDate;
          buff.push(s);
        }
      }
    }

    let buff2=[];
    while(buff.length>1 && buff[0].subjectCode !== buff[buff.length-1].subjectCode){
      buff2.push(buff[0]);
      buff2.push(buff[buff.length-1]);
      buff.shift();
      buff.pop();
    }

    if(buff2.length && buff.length && buff2[buff2.length-1].subjectCode === buff[0].subjectCode) buff2.push({});
    for(let i=0;i<buff.length;i++){
      buff2.push(buff[i]);
      buff2.push({});
    } 
    let totalRequiredSeats = buff2.length;
    let j=0;
    for(ele of hall){
      let seats = ele.totalSeats;
      for(let i=1;i<=seats && totalRequiredSeats!=0;i++){
        if(i===1 && !buff2[j].enrollmentId) {
          j++;
          totalRequiredSeats--;
        }
        buff2[j].seatNo = i.toString();
        buff2[j].roomNo= ele.roomNo;
        buff2[j++].deptName = ele.deptName;
        totalRequiredSeats--;
      }
      if(totalRequiredSeats==0) break;
    }
    let totalStudents = 0;
    for(b of buff2){
      if(b.enrollmentId) totalStudents++;
    }
    let totalInvigilators = invigilator.length;
    let stoir = Math.ceil(totalStudents/totalInvigilators);

  let inv= 0;
  let buff3=[];
    for(y of hall){
      if(totalInvigilators<=0) break;
      requiredInvigilators = Math.min(stoir*(y.totalSeats),totalInvigilators); 
      totalInvigilators-=requiredInvigilators;
      console.log("requied "+requiredInvigilators);
      for(let z=1;z<=requiredInvigilators;z++){
        let o= JSON.parse(JSON.stringify(invigilator[inv++]));
        o.roomNo = y.roomNo;
        o.deptName = y.deptName;
        o.date =date;
        buff3.push(o);
      }
    }
    for(x of buff2){
      if(x.enrollmentId)
      buffTotal.push(x);
    }
    for(q of buff3){
      buffTotal2.push(q);
    }
  }
  await db.getDb().createCollection('publishedStudentDetails');
  await db.getDb().collection('publishedStudentDetails').drop();

  const insertFlag1 = await db.getDb().collection('publishedStudentDetails').insertMany(buffTotal);
  console.log(insertFlag1)
  await db.getDb().createCollection('publishedInvigilatorDetails');
   await db.getDb().collection('publishedInvigilatorDetails').drop();

  const insertFlag2 = await db.getDb().collection('publishedInvigilatorDetails').insertMany(buffTotal2);
  console.log(insertFlag2)
}
else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})





app.get('/unpublish',function(req,res){
  if(req.session.isLoggedIn){
  res.redirect('/admin/student');
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data','others.json'))); 
  others.isPublished=false;
  fs.writeFileSync(path.join(__dirname,'data',"others.json"),JSON.stringify(others));
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
  })



//get methods

app.get('/',function(req,res){
  const filePath =path.join(__dirname,'views','navigator.html');
  res.status(200).sendFile(filePath);
})


app.get('/adminlogin', function (req, res) {
  res.status(200).render('login',{flag: 0,action: "/admin/student"});
})

app.get('/invigilatorLogin',function(req,res){
  res.status(200).render('login',{flag: 0,action:"/invigilator"});
})

app.get('/studentLogin', function (req, res) {
  res.status(200).render('studentLogin',{flag: 0});
})

app.get('/admin/student',async function(req,res){
  req.session.isLoggedIn
  if(!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const student = await db.getDb().collection('studentDetails').find().toArray();
  res.status(200).render('studentDetails',{student: student});
  }
})

app.get('/admin/invigilator',async function(req,res){
  req.session.isLoggedIn
  if(!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const invigilator = await db.getDb().collection('invigilatorDetails').find().toArray();
  res.status(200).render('invigilatorDetails',{invigilator: invigilator});
  }
})

app.get('/admin/course',async function(req,res){
  req.session.isLoggedIn
  if(!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const course = await db.getDb().collection('courseDetails').find().toArray();
  res.status(200).render('courseDetails',{course: course});
  }
})

app.get('/admin/hall',async function(req,res){
  req.session.isLoggedIn
  if(!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const hall = await db.getDb().collection('hallDetails').find().toArray();
  res.status(200).render('hallDetails',{hall: hall});
  }
})

app.get('/admin',async function(req,res){
  req.session.isLoggedIn
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'data','others.json')));
  if(!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const pstudent = await db.getDb().collection('publishedStudentDetails').find().toArray();
  const pinvigilator = await db.getDb().collection('publishedInvigilatorDetails').find().toArray();
  res.status(200).render('publish',{pstudent: pstudent,pinvigilator:pinvigilator,published: others.isPublished}); 
  }
})

db.connectToDatabase().then(function (){
app.listen(3000);
})