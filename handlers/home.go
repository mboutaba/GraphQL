package handlers

import (
	// "bytes"
	// "encoding/json"
	
	// "fmt"
	// "erros"
	"net/http"
	"text/template"
)


func errorTemplate(w http.ResponseWriter, errorCode int, errorTitle, errorMessage string) {
	tmpl, err := template.ParseFiles("templates/error.html")
	if err != nil {
		// If we can't even parse the error template, fall back to plain text
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(errorCode)
	data := struct {
		Code    int
		Title   string
		Message string
	}{
		Code:    errorCode,
		Title:   errorTitle,
		Message: errorMessage,
	}
	
	tmpl.Execute(w, data)
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	
	if r.URL.Path != "/home" {

			errorTemplate(w, http.StatusNotFound, "Page Not Found", 
			"The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")
		return
	}
	
	if r.Method != http.MethodGet {
		errorTemplate(w, http.StatusMethodNotAllowed, "Method Not Allowed",
			"The requested method is not allowed for this resource.")
		return
	}
	
	tmpl, err := template.ParseFiles("templates/home.html")
	if err != nil {
		errorTemplate(w, http.StatusInternalServerError, "Internal Server Error",
			"The server encountered an error while processing your request.")
		return
	}
	
	tmpl.Execute(w, nil)

	
}
