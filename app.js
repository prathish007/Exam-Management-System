const express = require('express');
const path = require('path');
const db = require('./data/database');
const mongodbStore = require('connect-mongodb-session');
const session = require('express-session');
const bcryptjs = require('bcryptjs');
const bodyParser = require('body-parser');
app = express();

const MongoDBStore = mongodbStore(session);
const sessionStore = new MongoDBStore({
  uri: 'mongodb://127.0.0.1:27017',
  databaseName: 'exam-management-portal',
  collection: 'sessions'
});

//middleware functions
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 }));
app.use(express.static('public'))
app.use(session({
  secret: 'prathish',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}))


//global variables
let isPublished = false;
let recordsPerPage = 100;
let currentStudentPageNo = 1;
let currentInvigilatorPageNo = 1;
let currentHallPageNo = 1;
let currentCoursePageNo = 1;
let currentPublishedStudentPageNo = 1;
let currentPublishedInvigilatorPageNo = 1;

//functions
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  enqueue(item, priority) {
    this.heap.push({ item, priority });
    this.bubbleUp();
  }

  dequeue() {
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown();
    }
    return min.item;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[parentIndex] = element;
      this.heap[index] = parent;
      index = parentIndex;
    }
  }

  bubbleDown() {
    let index = 0;
    const length = this.heap.length;
    const element = this.heap[0];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.priority < element.priority) {
          swap = leftChildIndex;
        }
      }
      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

function unique(arr){
  uni=[];      
  for(let obj of arr){
    let flag=true;
    for(let o of uni){
      if(o['courseCode'] === obj['courseCode'] && o['semester'] === obj['semester'] && o['subjectCode'] === obj['subjectCode'])
      flag=false;
    }
    if(flag) uni.push(obj);
  } 
return uni;

}


async function saveHallDetails(details) {
  console.log('inside save hall details');
  let pageNo = currentHallPageNo;
  let i = (pageNo - 1) * recordsPerPage + 1;
  const hallDetails = [];
  while (details['roomNo' + i]) {
    let o = {}
    o['roomNo'] = details['roomNo' + i];
    o['deptName'] = details['deptName' + i];
    o['totalSeats'] = details['totalSeats' + i];
    hallDetails.push(o);
    i++;
  }

  const allHallDetails = await db.getDb().collection('hallDetails').find().toArray();
  const oldHallDetails = allHallDetails.slice(Math.min((currentHallPageNo - 1) * recordsPerPage), Math.min(currentHallPageNo * recordsPerPage));
  const insertList = [];
  const updateList = [];
  const deleteList = [];

  for (oh of oldHallDetails) {
    let x = hallDetails.find(function (o) {
      return o.roomNo === oh.roomNo && o.deptName === oh.deptName;
    })
    if (x) updateList.push(x);
    else deleteList.push(oh);
  }


  for (nh of hallDetails) {
    let x = oldHallDetails.find(function (o) {
      return o.roomNo === nh.roomNo && o.deptName === nh.deptName;
    })
    if (!x) insertList.push(nh);
  }

  if (insertList.length) await db.getDb().collection('hallDetails').insertMany(insertList);

  if (updateList.length) {
    for (obj of updateList) {
      let updateObj = {
        $set: {
          'totalSeats': obj['totalSeats']
        }
      }
      await db.getDb().collection('hallDetails').updateOne({ 'roomNo': obj.roomNo, 'deptName': obj.deptName }, updateObj);

    }
  }
  if (deleteList.length) {
    for (obj of deleteList) await db.getDb().collection('hallDetails').deleteOne({ 'roomNo': obj.roomNo, 'deptName': obj.deptName });
  }

}

async function saveStudentDetails(details) {
  console.log('inside save student details');
  let pageNo = currentStudentPageNo;
  let i = (pageNo - 1) * recordsPerPage + 1;
  const studentDetails = [];
  while (details['enrollmentId' + i]) {
    let o = {}
    o['enrollmentId'] = details['enrollmentId' + i];
    o['name'] = details['name' + i];
    o['fatherName'] = details['fatherName' + i];
    o['gender'] = details['gender' + i];
    o['courseCode'] = details['courseCode' + i];
    o['semester'] = details['semester' + i];
    o['dob'] = details['dob' + i];
    o['address'] = details['address' + i];
    studentDetails.push(o);
    i++;
  }

  const allStudentDetails = await db.getDb().collection('studentDetails').find().toArray();
  const oldStudentDetails = allStudentDetails.slice(Math.min((currentStudentPageNo - 1) * recordsPerPage), Math.min(currentStudentPageNo * recordsPerPage));
  const insertList = [];
  const updateList = [];
  const deleteList = [];

  for (os of oldStudentDetails) {
    let x = studentDetails.find(function (o) {
      return o.enrollmentId === os.enrollmentId;
    })
    if (x) updateList.push(x);
    else deleteList.push(os);
  }


  for (ns of studentDetails) {
    let x = oldStudentDetails.find(function (o) {
      return o.enrollmentId === ns.enrollmentId;
    })
    if (!x) insertList.push(ns);
  }

  if (insertList.length) await db.getDb().collection('studentDetails').insertMany(insertList);

  if (updateList.length) {
    for (obj of updateList) {
      let updateObj = {
        $set: {
          'name': obj['name'],
          'fatherName': obj['fatherName'],
          'gender': obj['gender'],
          'courseCode': obj['courseCode'],
          'semester': obj['semester'],
          'dob': obj['dob'],
          'address': obj['address']
        }
      }
      await db.getDb().collection('studentDetails').updateOne({ 'enrollmentId': obj.enrollmentId }, updateObj);

    }
  }
  if (deleteList.length) {
    for (obj of deleteList) {

      await db.getDb().collection('studentDetails').deleteOne({ 'enrollmentId': obj.enrollmentId });
    }
  }

}

async function saveInvigilatorDetails(details) {
  console.log('inside save invigilator details');
  let pageNo = currentInvigilatorPageNo;
  let i = (pageNo - 1) * recordsPerPage + 1;
  let invigilatorDetails = [];
  while (details['staffId' + i]) {
    let o = {}
    o['staffId'] = details['staffId' + i];
    o['name'] = details['iname' + i];
    o['password'] = details['password' + i];
    invigilatorDetails.push(o);
    i++;
  }

  const allInvigilatorDetails = 
   db.getDb().collection('invigilatorDetails').find().toArray();
  const oldInvigilatorDetails = allInvigilatorDetails.slice(Math.min((currentInvigilatorPageNo - 1) * recordsPerPage), Math.min(currentInvigilatorPageNo * recordsPerPage));
  const insertList = [];
  const updateList = [];
  const deleteList = [];

  for (oi of oldInvigilatorDetails) {
    let x = invigilatorDetails.find(function (o) {
      return o.staffId === oi.staffId;
    })
    if (x) updateList.push(x);
    else deleteList.push(oi);
  }


  for (ni of invigilatorDetails) {
    let x = oldInvigilatorDetails.find(function (o) {
      return o.staffId === ni.staffId;
    })
    if (!x) insertList.push(ni);
  }

  if (insertList.length) await db.getDb().collection('invigilatorDetails').insertMany(insertList);

  if (updateList.length) {
    for (obj of updateList) {
      let updateObj = {
        $set: {
          'name': obj['name'],
          'password': obj['password']
        }
      }
      await db.getDb().collection('invigilatorDetails').updateOne({ 'staffId': obj.staffId }, updateObj);

    }
  }
  if (deleteList.length) {
    for (obj of deleteList) {
      await db.getDb().collection('invigilatorDetails').deleteOne({ 'staffId': obj.staffId });
    }
  }
}


async function saveCourseDetails(details) {
  console.log('inside save course details');
  let pageNo = currentCoursePageNo;
  let i = (pageNo - 1) * recordsPerPage + 1;
  const courseDetails = [];
  while (details['scourseCode' + i]) {
    let o = {}
    o['courseCode'] = details['scourseCode' + i];
    o['semester'] = details['ssemester' + i];
    o['subjectCode'] = details['subjectCode' + i];
    o['examDate'] = details['examDate' + i];
    courseDetails.push(o);
    i++;
  }

  const allCourseDetails = await db.getDb().collection('courseDetails').find().toArray();
  const oldCourseDetails = allCourseDetails.slice(Math.min((currentCoursePageNo - 1) * recordsPerPage), Math.min(currentCoursePageNo * recordsPerPage));
  const insertList = [];
  const updateList = [];
  const deleteList = [];

  for (oc of oldCourseDetails) {
    let x = courseDetails.find(function (o) {
      return o.subjectCode === oc.subjectCode;
    })
    if (x) updateList.push(x);
    else deleteList.push(oc);
  }


  for (nc of courseDetails) {
    let x = oldCourseDetails.find(function (o) {
      return o.subjectCode === nc.subjectCode;
    })
    if (!x) insertList.push(nc);
  }

  if (insertList.length) await db.getDb().collection('courseDetails').insertMany(insertList);

  if (updateList.length) {
    for (obj of updateList) {
      let updateObj = {
        $set: {
          'courseCode': obj['courseCode'],
          'semester': obj['semester'],
          'examDate': obj['examDate']
        }
      }
      await db.getDb().collection('courseDetails').updateOne({ 'subjectCode': obj.subjectCode }, updateObj);

    }
  }
  if (deleteList.length) {
    for (obj of deleteList) {
      await db.getDb().collection('courseDetails').deleteOne({ 'subjectCode': obj.subjectCode });
    }
  }
}

//post methods
app.post('/getHallTicket', async function (req, res) {
  console.log('inside get hall ticket');
  const userEnrollmentId = req.body.registrationNumber;
  const userDob = req.body.date;
  const studentDetails = await db.getDb().collection('studentDetails').find().toArray();
  let flag = 1;
  let student = {};
  for (const val of studentDetails) {
    if (val.enrollmentId === userEnrollmentId && val.dob === userDob) {
      flag = 0;
      student = val;
      break;
    }
  } 
  if (flag === 1) {

    res.render('studentLogin', { flag: flag });
  }
  if (!isPublished) flag = 2;
  if (flag === 0) {
    const examDetails = await db.getDb().collection('publishedStudentDetails').find().toArray();
    res.render('hallTicketDetails', { student: student, exam: examDetails, id: userEnrollmentId });
  }
  else res.render('studentLogin', { flag: flag });

})

app.post('/proctor', async function (req, res) {
  const invigilatorDetails = await db.getDb().collection('invigilatorDetails').find().toArray();
  let flag = 1;

  for (const val of invigilatorDetails) {
    if (val.staffId == req.body.id && val.password == req.body.password) {
      flag = 0;
      break;
    }
  }
  if (flag === 1) {
    res.render('login', { flag: flag, action: "/proctor" });
  }
  if (!isPublished) flag = 2;
  if (flag === 0) {
    const publishedInvigilatorDetails = await db.getDb().collection('publishedInvigilatorDetails').find().toArray();
    modPublishedInvigilatorDetails = [];
    for (let o of publishedInvigilatorDetails) {
      if (o['staffId'] == req.body.id) modPublishedInvigilatorDetails.push(o);
    }
    console.log(modPublishedInvigilatorDetails);
    res.render('invigilator', { exam: modPublishedInvigilatorDetails, id: req.body.id, x: false });
  }
  else res.render('login', { flag: flag, action: "/proctor" });

})

app.post('/verifyLogin', async function (req, res) {
  console.log('inside verifylogin');
  const userId = req.body.id;
  const password = req.body.password;
  const student = await db.getDb().collection('studentDetails').find().toArray();
  const adminarr = await db.getDb().collection('admin').find({ userId: 'admin' }).toArray();
  const admin = adminarr[0];
  const passwordAreEqual = await bcryptjs.compare(password, admin.password);
  if (userId === admin.userId && passwordAreEqual) {
    req.session.userId = admin.userId;
    req.session.isLoggedIn = true;
    res.redirect('/admin/student');
  }
  else {
    res.redirect('/adminLogin');
  }
})


app.post('/saveDetails', async function (req, res) {
  console.log('inside savedetails');
  if (req.session.isLoggedIn) {
    let type = req.body.type;
    if (type == 1) {
      await saveStudentDetails(req.body);
      currentStudentPageNo = req.body.pageNo;
      res.redirect('/admin/student');
    }
    else if (type == 2) {
      await saveInvigilatorDetails(req.body);
      currentInvigilatorPageNo = req.body.pageNo;
      res.redirect('/admin/invigilator');
    }
    else if (type == 3) {
      await saveCourseDetails(req.body);
      currentCoursePageNo = req.body.pageNo;
      res.redirect('/admin/course');
    }
    else if (type == 4) {
      await saveHallDetails(req.body);
      currentHallPageNo = req.body.pageNo;
      res.redirect('/admin/hall');
    }
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})





app.post('/logout', async function (req, res) {
  console.log('inside logout');
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    let type = req.body.type;
    if (type === 1) await saveStudentDetails(req.body);
    else if (type === 2) await saveInvigilatorDetails(req.body);
    else if (type === 3) await saveCourseDetails(req.body);
    else if (type === 4) await saveHallDetails(req.body);
    req.session.isLoggedIn = false;
    console.log(isPublished);
    res.redirect('/adminLogin');
  }
})


app.post('/next', async function (req, res) {
  console.log('inside next');
  if (req.session.isLoggedIn) {
    let type = req.body.type;
    if (type === '1') {
      await saveStudentDetails(req.body);
      currentStudentPageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin/student');
    }
    else if (type === '2') {
      await saveInvigilatorDetails(req.body);
      currentInvigilatorPageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin/invigilator');
    }
    else if (type === '3') {
      await saveCourseDetails(req.body);
      currentCoursePageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin/course');
    }
    else if (type === '4') {
      await saveHallDetails(req.body);
      currentHallPageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin/hall');
    }
    else if (type === '5') {
      currentPublishedStudentPageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin');
    }
    else if (type === '6') {
      currentPublishedInvigilatorPageNo = parseInt(req.body.pageNo) + 1;
      res.redirect('/admin');
    }
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post('/prev', async function (req, res) {
  console.log('inside prev');
  if (req.session.isLoggedIn) {
    let type = req.body.type;
    if (type === '1') {
      await saveStudentDetails(req.body);
      currentStudentPageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin/student');
    }
    else if (type === '2') {
      await saveInvigilatorDetails(req.body);
      currentInvigilatorPageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin/invigilator');
    }
    else if (type === '3') {
      await saveCourseDetails(req.body);
      currentCoursePageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin/course');
    }
    else if (type === '4') {
      await saveHallDetails(req.body);
      currentHallPageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin/hall');
    }
    else if (type === '5') {
      currentPublishedStudentPageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin');
    }
    else if (type === '6') {
      if (req.body.pageNo === '1') currentPublishedStudentPageNo--;
      else currentPublishedInvigilatorPageNo = parseInt(req.body.pageNo) - 1;
      res.redirect('/admin');
    }
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})

app.post("/publish", async function (req, res) {
  console.log('inside publish');
  if (req.session.isLoggedIn) {
    let type = req.body.type;
    if (type === '1') await saveStudentDetails(req.body);
    else if (type === '2') await saveInvigilatorDetails(req.body);
    else if (type === '3') await saveCourseDetails(req.body);
    else if (type === '4') await saveHallDetails(req.body);

    isPublished = true;
    const course = await db.getDb().collection('courseDetails').find({}, { projection: { _id: 0 } }).toArray();
    const hall = await db.getDb().collection('hallDetails').find({}, { projection: { _id: 0 } }).toArray();
    const student = await db.getDb().collection('studentDetails').find({}, { projection: { _id: 0 } }).toArray();
    const invigilator = await db.getDb().collection('invigilatorDetails').find({}, { projection: { _id: 0 } }).toArray();
    for (let i = 0; i < hall.length; i++) {
      hall[i]['filledSeats'] = 0;
    }
    try {
      await db.getDb().collection('publishedStudentDetails').drop();
    }
    catch (err) {
      console.log("error: " + err);
    }
    try {
      await db.getDb().collection('publishedInvigilatorDetails').drop();
    }
    catch (err) {
      console.log("error: " + err);
    }
    try {
      await db.getDb().createCollection('publishedStudentDetails');
    }
    catch (err) {
      console.log("caught error in while creating database for publishing student details" + err);
    }
    try {
      await db.getDb().createCollection('publishedInvigilatorDetails');
    }
    catch (err) {
      console.log("caught error in while creating database for publishing student details" + err);
    }

    const modHallDetails = [];
    const examDates = new Set();
    for (let obj of course) examDates.add(obj.examDate);
    for (let date of examDates) {
      let coursesOnSameDate = [];
      for (let obj of course) {
        if (obj['examDate'] === date) coursesOnSameDate.push(obj);
      }
      coursesOnSameDate=unique(coursesOnSameDate);

      studentJoinCourse = []
      for (let c of coursesOnSameDate) {
        for (let s of student) {
          if (c.courseCode === s.courseCode && c.semester === s.semester) {
            obj = { ...s };
            obj['subjectCode'] = c.subjectCode;
            obj['examDate'] = c.examDate;
            studentJoinCourse.push(obj);
          }
        }
      }
      const shuffledStudentJoinCourse = [];
      while (studentJoinCourse.length > 2 && studentJoinCourse[0]['subjectCode'] != studentJoinCourse[studentJoinCourse.length - 1]['subjectCode']) {
        shuffledStudentJoinCourse.push(studentJoinCourse.shift());
        shuffledStudentJoinCourse.push(studentJoinCourse.pop());
      }

      const publishedStudentDetails = [];
      let flag = false;
      let hallAndFilledSeats = [];
      for (let h of hall) {
        let filledSeats = 0;
        let sn = 1;
        if (!flag) {
          for (; sn <= h.totalSeats && shuffledStudentJoinCourse.length; sn++) {
            let obj = { ...shuffledStudentJoinCourse.shift() };
            obj['seatNo'] = sn;
            obj['roomNo'] = h['roomNo'];
            obj['deptName'] = h['deptName'];
            filledSeats++;
            publishedStudentDetails.push(obj);
          }
          if (!shuffledStudentJoinCourse.length) {
            flag = true;
          }
        }
        if (flag) {
          if (studentJoinCourse.length) {
            const lastAddedStudent = publishedStudentDetails[publishedStudentDetails.length - 1];
            if (lastAddedStudent && lastAddedStudent['roomNo'] === h['roomNo'] && studentJoinCourse.length && lastAddedStudent['subjectCode'] === studentJoinCourse[0]) sn++;
            for (; sn <= h.totalSeats && studentJoinCourse.length; sn += 2) {
              let obj = { ...studentJoinCourse.shift() };
              obj['seatNo'] = sn;
              obj['roomNo'] = h['roomNo'];
              obj['deptName'] = h['deptName'];
              filledSeats++;
              publishedStudentDetails.push(obj);
            }
          }
          else break;
        }
        let hwrs = {};
        hwrs['roomNo'] = h['roomNo'];
        hwrs['deptName'] = h['deptName'];
        hwrs['filledSeats'] = filledSeats;
        hallAndFilledSeats.push(hwrs);
      }
      let dah = {}
      dah['date'] = date;
      dah['halls'] = hallAndFilledSeats;
      modHallDetails.push(dah);

      try {
        await db.getDb().collection('publishedStudentDetails').insertMany(publishedStudentDetails);
      }
      catch (err) {
        console.log("caught error in while publishing student details" + err);
      }
    }

    
    let publishedInvigilatorDetails = [];
    let totalInviligators = invigilator.length;
    for (let o of modHallDetails) {
      totalFilledSeats = 0;
      let halls = o['halls'];
      for (let h of halls) {
        totalFilledSeats += Number.parseInt(h['filledSeats']);
      }
      let invToSeatsRatio = totalInviligators / totalFilledSeats;
      let invInd = 0;
      pq = new PriorityQueue();
      for (let h of halls) {
        let reqInv = Math.floor(invToSeatsRatio * h.filledSeats);
        let leftOver = invToSeatsRatio * h.filledSeats - reqInv;
        pq.enqueue(h, leftOver);
        while (reqInv--) {
          let obj = {};
          obj['date'] = o['date'];
          obj['staffId'] = invigilator[invInd]['staffId'];
          obj['name'] = invigilator[invInd]['name'];
          obj['roomNo'] = h['roomNo'];
          obj['deptName'] = h['deptName'];
          publishedInvigilatorDetails.push(obj);
          invInd++;
        }
      }
      while (invInd < totalInviligators) {
        let h=pq.dequeue();
        let obj = {};
        obj['date'] = o['date'];
        obj['staffId'] = invigilator[invInd]['staffId'];
        obj['name'] = invigilator[invInd]['name'];
        obj['roomNo'] = h['roomNo'];
        obj['deptName'] = h['deptName'];
        publishedInvigilatorDetails.push(obj);
        invInd++;
      }


    }
    try {
      await db.getDb().collection('publishedInvigilatorDetails').insertMany(publishedInvigilatorDetails);
    }
    catch (err) {
      console.log("caught error in while publishing student details" + err);
    }
    res.redirect('/admin');
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');

})



//get methods

app.get('/unpublish', async function (req, res) {
  console.log('inside unpublish');
  if (req.session.isLoggedIn) {
    isPublished = false;
    currentPublishedPageNo = 1;
    res.redirect('/admin/student');
    try {
      await db.getDb().collection('publishedStudentDetails').drop();
    }
    catch (err) {
      console.log("error: " + err);
    }
    try {
      await db.getDb().collection('publishedInvigilatorDetails').drop();
    }
    catch (err) {
      console.log("error: " + err);
    }
  }
  else res.status(401).send('<h1>Unauthorized Access!<h1/>');
})




app.get('/', function (req, res) {
  console.log('inside /');
  const filePath = path.join(__dirname, 'views', 'navigator.html');
  res.status(200).sendFile(filePath);
})


app.get('/adminlogin', function (req, res) {
  console.log('inside adminlogin get');
  if (req.session.isLoggedIn) res.redirect('admin/student');
  else res.status(200).render('login', { flag: 0, action: "/verifyLogin" });
})

app.get('/invigilatorLogin', function (req, res) {
  console.log('inside invigilator login get');
  res.status(200).render('login', { action: "/proctor", flag: 0 });
})

app.get('/studentLogin', function (req, res) {
  console.log('inside studentLogin get');
  res.status(200).render('studentLogin', { flag: 0 });
})

app.get('/admin', async function (req, res) {
  console.log('inside admin get');
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    const student = await db.getDb().collection('publishedStudentDetails').find().toArray()
    const pstudent = student.slice(Math.min(recordsPerPage * (currentPublishedStudentPageNo - 1), student.length), Math.min(recordsPerPage * currentPublishedStudentPageNo, student.length));
    if (pstudent.length) {
      let prevFlag = false;
      let nextFlag = true;
      if (currentPublishedStudentPageNo > 1) prevFlag = true;
      res.status(200).render('publishStudent', { pstudent: pstudent, published: isPublished, pageNo: currentPublishedStudentPageNo, prevFlag: prevFlag, nextFlag: nextFlag });
    }
    else {
      const invigilator = await db.getDb().collection('publishedInvigilatorDetails').find().toArray();
      const pinvigilator = invigilator.slice(Math.min(recordsPerPage * (currentPublishedInvigilatorPageNo - 1), invigilator.length), Math.min(recordsPerPage * currentInvigilatorPageNo, invigilator.length));
      let prevFlag = true;
      let nextFlag = false;
      if (pinvigilator.length > recordsPerPage * currentPublishedInvigilatorPageNo) nextFlag = true;
      if (currentPublishedInvigilatorPageNo > 1) prevFlag = true;
      res.status(200).render('publishInvigilator', {
        pinvigilator: pinvigilator,
        published: isPublished,
        pageNo: currentPublishedInvigilatorPageNo,
        prevFlag: prevFlag, nextFlag: nextFlag
      });

    }
  }
})


app.get('/admin/student', async function (req, res) {
  console.log('inside admin student get');
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    if (isPublished) res.redirect('/admin');
    else {
      const student = await db.getDb().collection('studentDetails').find().toArray();
      let prevFlag = false;
      let nextFlag = false;
      if (currentStudentPageNo > 1) prevFlag = true;
      if (student.length > recordsPerPage * currentStudentPageNo) nextFlag = true;
      console.log(isPublished);
      res.status(200).render('studentDetails', { student: student.slice(Math.min(recordsPerPage * (currentStudentPageNo - 1), student.length), Math.min(recordsPerPage * currentStudentPageNo, student.length)), prevFlag: prevFlag, nextFlag: nextFlag, pageNo: currentStudentPageNo, recordsPerPage: recordsPerPage });
    }
  }
})

app.get('/admin/invigilator', async function (req, res) {
  console.log('inside admin invigilator get');
  console.log(req.session.isLoggedIn);
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    if (isPublished) res.redirect('/admin');
    const invigilator = await db.getDb().collection('invigilatorDetails').find().toArray();
    let prevFlag = false;
    if (currentInvigilatorPageNo > 1) prevFlag = true;
    let nextFlag = false;
    if (invigilator.length > recordsPerPage * currentInvigilatorPageNo) nextFlag = true;

    res.status(200).render('invigilatorDetails', { invigilator: invigilator.slice(Math.min(recordsPerPage * (currentInvigilatorPageNo - 1), invigilator.length), Math.min(recordsPerPage * currentInvigilatorPageNo, invigilator.length)), prevFlag: prevFlag, nextFlag: nextFlag, pageNo: currentInvigilatorPageNo, recordsPerPage: recordsPerPage });
  }
})

app.get('/admin/course', async function (req, res) {
  console.log('inside admin course get');
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    if (isPublished) res.redirect('/admin');
    const course = await db.getDb().collection('courseDetails').find().toArray();
    let prevFlag = false;
    if (currentCoursePageNo > 1) prevFlag = true;
    let nextFlag = false;
    if (course.length > recordsPerPage * currentCoursePageNo) nextFlag = true;

    res.status(200).render('courseDetails', { course: course.slice(Math.min(recordsPerPage * (currentCoursePageNo - 1), course.length), Math.min(recordsPerPage * currentCoursePageNo, course.length)), prevFlag: prevFlag, nextFlag: nextFlag, pageNo: currentCoursePageNo, recordsPerPage: recordsPerPage });
  }
})

app.get('/admin/hall', async function (req, res) {
  console.log('inside admin hall get');
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    if (isPublished) res.redirect('/admin');
    const hall = await db.getDb().collection('hallDetails').find().toArray();
    let prevFlag = false;
    if (currentHallPageNo > 1) prevFlag = true;
    let nextFlag = false;
    if (hall.length > recordsPerPage * currentHallPageNo) nextFlag = true;

    res.status(200).render('hallDetails', { hall: hall.slice(Math.min(recordsPerPage * (currentHallPageNo - 1), hall.length), Math.min(recordsPerPage * currentHallPageNo, hall.length)), prevFlag: prevFlag, nextFlag: nextFlag, pageNo: currentHallPageNo, recordsPerPage: recordsPerPage });
  }
})


app.get('/logout', function (req, res) {
  console.log('inside logout get')
  if (!req.session.isLoggedIn) res.status(401).send('<h1>Access Blocked! Unauthorized Access</h1>');
  else {
    req.session.isLoggedIn = false;
    console.log(isPublished);
    res.redirect('/adminLogin');
  }
})

db.connectToDatabase().then(function () {
  console.log("Server Running at port 8000");
  app.listen(8000);
})