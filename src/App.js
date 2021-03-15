import './App.css';
import React, {useEffect, useReducer} from "react";
import { API } from "aws-amplify";
import {List, Input, Button} from "antd";
import {v4 as uuid} from "uuid"
import {listNotes} from "./graphql/queries";

import {createNote as CreateNote, deleteNote as DeleteNote, updateNote as UpdateNote} from "./graphql/mutations"

import {onCreateNote} from "./graphql/subscriptions"

const clientID = uuid()

const initialState = {
  notes: [],
  loading: true,
  error: false,
  form: {name: "", description: ""}
}

const styles = {
  container: {padding: 20},
  input: {marginBottom: 10},
  item: {'textAlign': "left"},
  p: {color: "#1890ff"}
}

function reducer(state, action) {
  switch(action.type) {
    case "SET_NOTES":
      return {...state, notes: action.notes, loading: false};

    case "ADD_NOTES":
      return {...state, notes: [action.note, ...state.notes]}
    case "RESET_FORM":
      return {...state, form: initialState.form}
    
    case "SET_INPUT":
      return {...state, form:{...state.form, [action.name]: action.value}}
    case "ERROR":
      return {...state, error: true, loading: false};
    default:
      return {...state};
  }
}


export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  async function fetchNotes() {
    try {
      const notesData = await API.graphql({query: listNotes});
      dispatch({type: "SET_NOTES", notes: notesData.data.listNotes.items })
    }
    catch(err) {
      console.log("Error: ", err);
      dispatch({type: "ERROR"})
    }
  }


  async function createNote() {
    const {form} = state;
    if (!form.name || !form.description) {
      return alert("Please enter a name and description....")
    }

    const note = {...form, clientID: clientID, completed: false, id: uuid() };
    dispatch({type: "ADD_NOTES", note: note});
    dispatch({type: "RESET_FORM"});

    try {
      await API.graphql({query: CreateNote, variables: {input: note}});
      console.log("Successfully created...");
    } catch(err) {
      console.log("Err: ", err);
    }
  }

  async function deleteNote( id ) {
    const index = state.notes.findIndex(note => note.id === id);

    const notes = [
      ...state.notes.slice(0, index), ...state.notes.slice(index+1)
    ];

    dispatch({type: "SET_NOTES", notes});

    try{
      await API.graphql({
        query: DeleteNote, variables: {input: {id}}
      })

      console.log("Successfully deleted...")
    } catch(err){
      console.log("Err: ", err);
    }
  }


  async function updateNote(note) {

    const index = state.notes.findIndex(n => n.id === note.id)
    const notes = [...state.notes]
    notes[index].completed = !note.completed

    dispatch({type: "SET_NOTES", notes})
    try{
      await API.graphql({
        query: UpdateNote, variables: {input: {id: note.id, completed: notes[index].completed}}
      })

      console.log("Successfully updated....")

    } catch(err) {

      console.log("Error: ", err)

    }

  }

 useEffect(()=> {
   fetchNotes();
   const subscription = API.graphql({ query: onCreateNote }) .subscribe({ next: noteData => { const note = noteData.value.data.onCreateNote
      if (clientID=== note.clientId) return dispatch({ type: 'ADD_NOTE', note }) } })
      return () => subscription.unsubscribe() }, [])

 function renderItem(item) {
   return (

       <List.Item style={styles.item} actions={[<p style={styles.p} onClick={() => deleteNote(item.id)}>Delete</p>,
        <p style={styles.p} onClick={() => updateNote(item)}> {item.completed ? 'completed' : 'mark completed'} </p>]}>
       <List.Item.Meta
        title={item.name}
        description = {item.description}
       
       />

       </List.Item>
   )
 }

 function onChange(e) {
   dispatch({type: "SET_INPUT", name: e.target.name, value: e.target.value })
 }


 return (
   
   <div style={styles.container}> 

   <Input
    onChange = {onChange}
    value={state.form.name}
    placeholder="Note Name"
    name="name"
    style={styles.input}
   />

   <Input
   onChange = {onChange}
   value={state.form.description}
   placeholder="Note Description"
   name="description"
   style={styles.input}
  />
  <Button onClick={createNote} type="primary">
    Create Note
    
  </Button>


    <List
      loading={state.loading}
      dataSource={state.notes}
      renderItem = {renderItem}
    
    />

   
   </div>
 )
}

