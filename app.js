const express = require('express');
const fs = require('fs');
const path =  require('path');
app = express();


//middleware functions
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.urlencoded({extended:false}));
app.use(express.static('public'))

//other funtions
function saveDetails(details){
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
  fs.writeFileSync(path.join(__dirname,"studentDetails.json"),JSON.stringify(studentDetails));
  
  
  i=1;
  const invigilatorDetails = [];
  while(details['staffId'+i]){
    let o={}
    o['staffId']=details['staffId'+i];
    o['name'] =details['iname'+i];
    o['password']=details['password'+i];
    invigilatorDetails.push(o);
    i++;
  }
  fs.writeFileSync(path.join(__dirname,"invigilatorDetails.json"),JSON.stringify(invigilatorDetails));
  
  
  i=1;
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
  fs.writeFileSync(path.join(__dirname,"courseDetails.json"),JSON.stringify(courseDetails));
  
  
  
  i=1;
  const hallDetails = [];
  while(details['roomNo'+i]){
    let o={}
    o['roomNo']=details['roomNo'+i];
    o['deptName'] =details['deptName'+i];
    o['totalSeats']=details['totalSeats'+i];
    hallDetails.push(o);
    i++;
  }
  fs.writeFileSync(path.join(__dirname,"hallDetails.json"),JSON.stringify(hallDetails));

  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));

}

//post methods
app.post('/getHallTicket',function(req,res){
  const userEnrollmentId = req.body.registrationNumber;
  const userDob = req.body.date;
  const filePath = path.join(__dirname,'studentDetails.json');
  const studentDetails = JSON.parse(fs.readFileSync(filePath));
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
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
  if(!others.isPublished) flag=2;
  if(flag===0){
    const examDetails = JSON.parse(fs.readFileSync(path.join(__dirname,"publishedStudentDetails.json"))); 
     res.render('hallTicketDetails',{student: student,exam: examDetails,id: userEnrollmentId});
  }
  else res.render('studentLogin',{flag:flag});

})


app.post('/admin',function(req,res){
const id = req.body.id;
const password = req.body.password;
const student = JSON.parse(fs.readFileSync(path.join(__dirname,'studentDetails.json')));
const invigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'invigilatorDetails.json')));
const course = JSON.parse(fs.readFileSync(path.join(__dirname,'courseDetails.json')));
const hall = JSON.parse(fs.readFileSync(path.join(__dirname,'hallDetails.json')));
if(id==='admin' && password=='password123'){
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
  others.isLoggedIn=true;
  const pstudent = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedStudentDetails.json')));
  const pinvigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedInvigilatorDetails.json')));
  fs.writeFileSync(path.join(__dirname,'others.json'),JSON.stringify(others));
  res.render('admin',{student: student,invigilator: invigilator,course: course,hall: hall,pstudent: pstudent,pinvigilator:pinvigilator,published: others.isPublished}); 
}
const invigilatorDetails = JSON.parse(fs.readFileSync(path.join(__dirname,'invigilatorDetails.json')));
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
const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
if(!others.isPublished) flag=2;
if(flag===0){
  const publishedInvigilatorDetails = JSON.parse(fs.readFileSync(path.join(__dirname,"publishedInvigilatorDetails.json")));
   res.render('invigilator',{exam: publishedInvigilatorDetails,id: id});
}
else res.render('login',{flag:flag});

})


app.post('/saveDetails',function(req,res){
res.redirect('/admin');
saveDetails(req.body);
})


app.post('/logout',function(req,res){
const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
others.isLoggedIn = false;
fs.writeFileSync(path.join(__dirname,'others.json'),JSON.stringify(others));
res.redirect('/login');
if(!others.isPublished)
saveDetails(req.body);
})




//algorithm for shuffling students based on thier subject code
app.post("/publish",function(req,res){
  saveDetails(req.body);
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,"others.json")));
  others.isPublished=true;
  fs.writeFileSync(path.join(__dirname,"others.json"),JSON.stringify(others)); 
  res.redirect('/admin')

  //getting same dates for all subject courses
  const course = JSON.parse(fs.readFileSync(path.join(__dirname,"courseDetails.json")));
  const hall = JSON.parse(fs.readFileSync(path.join(__dirname,"hallDetails.json")));
  const student =JSON.parse(fs.readFileSync(path.join(__dirname,"studentDetails.json")));
  const invigilator =JSON.parse(fs.readFileSync(path.join(__dirname,"invigilatorDetails.json")));
  
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
    // console.log(buff2);
    let totalStudents = 0;
    for(b of buff2){
      if(b.enrollmentId) totalStudents++;
    }
    let totalInvigilators = invigilator.length;
    let stoir = Math.ceil(totalStudents/totalInvigilators);

    // console.log(stoir)
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
  console.log(buffTotal2);
  fs.writeFileSync(path.join(__dirname,"publishedStudentDetails.json"),JSON.stringify(buffTotal));
  fs.writeFileSync(path.join(__dirname,"publishedInvigilatorDetails.json"),JSON.stringify(buffTotal2));
  
})









app.post('/unpublish',function(req,res){
  const student = JSON.parse(fs.readFileSync(path.join(__dirname,'studentDetails.json')));
  const invigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'invigilatorDetails.json')));
  const course = JSON.parse(fs.readFileSync(path.join(__dirname,'courseDetails.json')));
  const hall = JSON.parse(fs.readFileSync(path.join(__dirname,'hallDetails.json')));
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
  others.isPublished=false;
  fs.writeFileSync(path.join(__dirname,"others.json"),JSON.stringify(others));
    if(others.isLoggedIn){
      const pstudent = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedStudentDetails.json')));
    const pinvigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedInvigilatorDetails.json')));
      res.render('admin',{student: student,invigilator: invigilator,course: course,hall: hall,pstudent: pstudent,pinvigilator: pinvigilator,published: others.isPublished}); 
    }
  })



//get methods
app.get('/unpublish',function(req,res){
const student = JSON.parse(fs.readFileSync(path.join(__dirname,'studentDetails.json')));
const invigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'invigilatorDetails.json')));
const course = JSON.parse(fs.readFileSync(path.join(__dirname,'courseDetails.json')));
const hall = JSON.parse(fs.readFileSync(path.join(__dirname,'hallDetails.json')));
const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
others.isPublished=false;
fs.writeFileSync(path.join(__dirname,"others.json"),JSON.stringify(others));
  if(others.isLoggedIn){
    res.render('admin',{student: student,invigilator: invigilator,course: course,hall: hall,published: others.isPublished}); 
  }
})

app.get('/login', function (req, res) {
  res.render('login',{flag: 0});
})
app.get('/studentLogin', function (req, res) {
  res.render('studentLogin',{flag: 0});
})
app.get('/', function (req, res) {
  res.render('studentLogin',{flag: 0});
})
app.get('/admin',function(req,res){
  const filePath = path.join(__dirname,'others.json');
  const data = JSON.parse(fs.readFileSync(filePath));
  if(!data.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else{
  const student = JSON.parse(fs.readFileSync(path.join(__dirname,'studentDetails.json')));
  const invigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'invigilatorDetails.json')));
  const course = JSON.parse(fs.readFileSync(path.join(__dirname,'courseDetails.json')));
  const hall = JSON.parse(fs.readFileSync(path.join(__dirname,'hallDetails.json')));
  const others = JSON.parse(fs.readFileSync(path.join(__dirname,'others.json')));
  const pstudent = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedStudentDetails.json')));
  const pinvigilator = JSON.parse(fs.readFileSync(path.join(__dirname,'publishedInvigilatorDetails.json')));
  res.status(200).render('admin',{student: student,invigilator: invigilator,course: course,hall: hall,pstudent:pstudent,pinvigilator:pinvigilator,isSaved: false,published: others.isPublished});
  }
})



app.listen(3000);